import sqlite3
import os
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")
DEFAULT_PEPPER = "D30tt3rk3y"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_setting(key, default=""):
    conn = get_conn()
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else default


def set_setting(key, value):
    conn = get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, value),
    )
    conn.commit()
    conn.close()


def _get_pepper():
    return get_setting("pepper") or DEFAULT_PEPPER


def hash_password(password):
    return generate_password_hash(password + _get_pepper(), method="pbkdf2:sha256")


def check_password(stored_hash, password):
    return check_password_hash(stored_hash, password + _get_pepper())


def init_db():
    conn = get_conn()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email    TEXT NOT NULL DEFAULT '',
            password TEXT NOT NULL,
            role     TEXT NOT NULL DEFAULT 'user',
            status   TEXT NOT NULL DEFAULT 'active'
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL DEFAULT ''
        )
    """)
    conn.commit()

    # Migrations: add columns that may not exist in older databases
    for col, defn in [
        ("email",       "TEXT NOT NULL DEFAULT ''"),
        ("status",      "TEXT NOT NULL DEFAULT 'active'"),
        ("submissions", "INTEGER NOT NULL DEFAULT 0"),
    ]:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {defn}")
            conn.commit()
        except Exception:
            pass

    # Seed default pepper if not yet set
    row = conn.execute("SELECT value FROM settings WHERE key = 'pepper'").fetchone()
    if not row:
        conn.execute("INSERT INTO settings (key, value) VALUES ('pepper', ?)", (DEFAULT_PEPPER,))
        conn.commit()

    _pepper_row = conn.execute("SELECT value FROM settings WHERE key = 'pepper'").fetchone()
    pepper = (_pepper_row["value"] if _pepper_row else None) or DEFAULT_PEPPER

    # Seed default admin users on fresh database
    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        for username, password, role in [
            ("admin",       "pa$$w0rd", "admin"),
            ("hackychucky", "$ucce$$",  "admin"),
        ]:
            conn.execute(
                "INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
                (username, "", generate_password_hash(password + pepper, method="pbkdf2:sha256"), role, "active"),
            )
        conn.commit()

    conn.close()


def get_user(username):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return dict(row) if row else None


def list_users():
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, username, email, role, status, submissions FROM users ORDER BY status DESC, id"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def increment_submissions(username):
    conn = get_conn()
    conn.execute("UPDATE users SET submissions = submissions + 1 WHERE username = ?", (username,))
    conn.commit()
    conn.close()


def get_top_users(limit=3):
    conn = get_conn()
    rows = conn.execute(
        "SELECT username, submissions FROM users WHERE status = 'active' AND submissions > 0 ORDER BY submissions DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_user(username, password, role="user", email="", status="pending"):
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
            (username, email, hash_password(password), role, status),
        )
        conn.commit()
        return True, None
    except sqlite3.IntegrityError:
        return False, f"Username '{username}' already exists."
    finally:
        conn.close()


def delete_user(username):
    conn = get_conn()
    cur = conn.execute("DELETE FROM users WHERE username = ?", (username,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


def update_password(username, new_password):
    conn = get_conn()
    cur = conn.execute(
        "UPDATE users SET password = ? WHERE username = ?",
        (hash_password(new_password), username),
    )
    conn.commit()
    updated = cur.rowcount > 0
    conn.close()
    return updated


def update_user_field(username, field, value):
    if field not in ("role", "status"):
        raise ValueError(f"Invalid field: {field}")
    conn = get_conn()
    cur = conn.execute(f"UPDATE users SET {field} = ? WHERE username = ?", (value, username))
    conn.commit()
    updated = cur.rowcount > 0
    conn.close()
    return updated


def verify_password(username, password):
    user = get_user(username)
    if not user:
        return None
    if check_password(user["password"], password):
        return user
    return None


def count_pending_users():
    conn = get_conn()
    count = conn.execute("SELECT COUNT(*) FROM users WHERE status = 'pending'").fetchone()[0]
    conn.close()
    return count

#!/usr/bin/env python3
"""
DeOtter user management CLI.

Usage:
    python manage_users.py list
    python manage_users.py create <username> <password> [--role admin|user]
    python manage_users.py delete <username>
    python manage_users.py password <username> <new_password>
"""
import sys
from db import init_db, list_users, create_user, delete_user, update_password


def cmd_list():
    users = list_users()
    if not users:
        print("No users found.")
        return
    print(f"{'ID':<5} {'Username':<20} {'Email':<32} {'Role'}")
    print("-" * 62)
    for u in users:
        print(f"{u['id']:<5} {u['username']:<20} {u.get('email', ''):<32} {u['role']}")


def cmd_create(args):
    if len(args) < 2:
        print("Usage: create <username> <password> [--role admin|user] [--email addr]")
        sys.exit(1)
    username, password = args[0], args[1]
    role = "user"
    email = ""
    if "--role" in args:
        idx = args.index("--role")
        if idx + 1 < len(args):
            role = args[idx + 1]
    if "--email" in args:
        idx = args.index("--email")
        if idx + 1 < len(args):
            email = args[idx + 1]
    if role not in ("admin", "user"):
        print("Role must be 'admin' or 'user'.")
        sys.exit(1)
    ok, err = create_user(username, password, role, email=email)
    if ok:
        print(f"User '{username}' created with role '{role}'.")
    else:
        print(f"Error: {err}")
        sys.exit(1)


def cmd_delete(args):
    if not args:
        print("Usage: delete <username>")
        sys.exit(1)
    username = args[0]
    if input(f"Delete user '{username}'? [y/N] ").lower() != "y":
        print("Cancelled.")
        return
    if delete_user(username):
        print(f"User '{username}' deleted.")
    else:
        print(f"User '{username}' not found.")
        sys.exit(1)


def cmd_password(args):
    if len(args) < 2:
        print("Usage: password <username> <new_password>")
        sys.exit(1)
    username, new_password = args[0], args[1]
    if update_password(username, new_password):
        print(f"Password updated for '{username}'.")
    else:
        print(f"User '{username}' not found.")
        sys.exit(1)


COMMANDS = {
    "list": cmd_list,
    "create": cmd_create,
    "delete": cmd_delete,
    "password": cmd_password,
}

if __name__ == "__main__":
    init_db()
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    extra = sys.argv[2:]
    if cmd == "list":
        cmd_list()
    else:
        COMMANDS[cmd](extra)

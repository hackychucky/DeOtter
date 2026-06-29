# DeOtter — Developer Notes

This file is for the developer only. It is listed in `.gitignore` and never committed.

---

## Architecture Overview

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (CRA), inline styles, CSS custom properties |
| Backend | Flask + Flask-CORS, Python 3.9+ |
| Database | SQLite via `sqlite3` (no ORM) |
| Auth | JWT (PyJWT), password hashing via werkzeug (pbkdf2:sha256) |
| AI (cloud) | Anthropic Claude SDK, OpenAI SDK (also used for Azure Foundry) |
| AI (local) | HuggingFace Transformers + PyTorch |
| Start | `concurrently` in package.json runs both Flask and React with `npm start` |

### Ports

- Flask: **5001** (5000 is occupied by macOS AirPlay Receiver / ControlCenter)
- React: **3000**

### Key files

| File | Role |
|------|------|
| `backend/app.py` | All Flask routes, AI provider logic, settings endpoints |
| `backend/auth.py` | JWT creation/decode, `@require_auth` decorator, `/auth/login`, `/auth/register` |
| `backend/db.py` | SQLite schema, CRUD helpers, password hashing, settings k/v store |
| `backend/deotter.py` | The actual deobfuscation engine (10 detection + transform functions) |
| `backend/manage_users.py` | CLI tool: list/create/delete/password |
| `backend/models_config.json` | Name → path map for local HuggingFace models |
| `frontend/src/App.js` | Single-file React app (all components) |
| `frontend/src/App.css` | Global styles, `.deotter-btn` class |

---

## Authentication Flow

1. React shows `LoginPage` (sign-in/sign-up toggle) before everything else.
2. Sign-in: `POST /auth/login` → Flask verifies password (pbkdf2:sha256 + pepper), returns JWT.
3. Sign-up: `POST /auth/register` → creates user with `status="pending"`, returns 201 (no JWT).
4. JWT payload: `{ sub: username, role: "admin"|"user", exp: now+8h }`.
5. JWT signed with `DEOTTER_SECRET` env var (default: hardcoded fallback — insecure for prod).
6. Token stored in `localStorage.deotter_token`. Sent as `Authorization: Bearer <token>` on every request.
7. `@require_auth` decorator in `auth.py` decodes the token and sets `request.current_user`.
8. On 401, `authFetch()` in React automatically calls `handleLogout()` (removes token, shows login).
9. Admin approves pending users via `/admin/users/<username>/approve` (sets `status="active"`).

### Password security

- Hashed with `werkzeug.generate_password_hash(password + pepper, method="pbkdf2:sha256")`.
- Pepper stored in the `settings` table (key: `"pepper"`, default: `"D30tt3rk3y"`).
- Pepper can be changed via Settings UI (admin only) — **invalidates all existing passwords**.
- `scrypt` is not used because it requires Python 3.10+ and the venv is 3.9.

---

## Database Schema

```sql
CREATE TABLE users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT UNIQUE NOT NULL,
    email       TEXT NOT NULL DEFAULT '',
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'user',   -- 'admin' | 'user'
    status      TEXT NOT NULL DEFAULT 'active', -- 'active' | 'pending' | 'disabled'
    submissions INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
);
```

Migrations run at startup in `init_db()` using `ALTER TABLE ... ADD COLUMN` in a try/except (safe to re-run).

### New tables (threat actor attribution)

```sql
CREATE TABLE threat_actors (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by  TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE threat_actor_samples (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    threat_actor_id INTEGER NOT NULL,
    code_snippet    TEXT NOT NULL DEFAULT '',   -- first 1000 chars
    techniques      TEXT NOT NULL DEFAULT '[]', -- JSON array
    notes           TEXT NOT NULL DEFAULT '',
    source          TEXT NOT NULL DEFAULT 'report', -- 'report' | 'lmi'
    created_by      TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (threat_actor_id) REFERENCES threat_actors(id) ON DELETE CASCADE
);
```

Tables are created automatically in `init_db()` alongside the existing tables.

### Settings keys used

| Key | Value |
|-----|-------|
| `pepper` | Password pepper string |
| `ai_provider` | `"anthropic"` \| `"azure"` \| `"openai"` |
| `anthropic_key` | Anthropic API key |
| `azure_endpoint` | Azure AI Foundry endpoint URL |
| `azure_key` | Azure AI Foundry API key |
| `azure_deployment` | Deployment name in Foundry |
| `openai_key` | OpenAI API key |
| `openai_model` | OpenAI model name (default: `gpt-4o`) |
| `logo_override` | Filename of custom logo in `frontend/public/` |
| `model_policy` | JSON object: `{ "ModelName": "allowed" }` |

---

## AI Provider System

### How `_call_ai(prompt)` works

Located in `app.py`. Priority chain:

1. Read provider + credentials from `settings` DB table (set via Settings UI).
2. Fall back to environment variables if DB value is empty.
3. Auto-detect provider if not explicitly set (azure > anthropic > openai).

```
DB settings  →  env vars  →  auto-detect
```

### Azure AI Foundry integration

Uses the standard `openai` Python SDK with `base_url` (not `AzureOpenAI`):

```python
from openai import OpenAI
client = OpenAI(base_url=azure_endpoint, api_key=azure_key)
response = client.responses.create(model=azure_deploy, input=prompt)
return response.output_text, "azure"
```

This matches what Azure AI Foundry shows in its "Call this model" instructions. Fields required: **Endpoint**, **Deployment Name**, **API Key** (no API version needed).

### Anthropic integration

```python
import anthropic
client = anthropic.Anthropic(api_key=anthropic_key)
message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    messages=[{"role": "user", "content": prompt}],
)
return message.content[0].text, "anthropic"
```

### OpenAI integration

```python
from openai import OpenAI
client = OpenAI(api_key=openai_key)
response = client.chat.completions.create(
    model=openai_model, messages=[{"role": "user", "content": prompt}], max_tokens=4096
)
return response.choices[0].message.content, "openai"
```

---

## Local Model System

### Flow

1. `GET /available-models` returns keys from `models_config.json`.
2. `POST /load-model` tries `pipeline("text-generation", ...)` then `pipeline("text2text-generation", ...)`.
3. Loaded pipeline stored in global `MODEL_PIPELINE`, name in `LOADED_MODEL_NAME`.
4. `POST /local-deobfuscate` builds a prompt and calls `MODEL_PIPELINE(prompt, max_new_tokens=1024)`.
5. `GET /local-model-status` returns `{ loaded, model, transformers_available }` for the UI.

### Requirements

```bash
pip install torch transformers
```

Only generative models work. Encoder-only models (CodeBERT) fail to load with a clear error message.

### models_config.json format

```json
{
  "ModelName": "/absolute/path/to/model/directory"
}
```

Model must be already downloaded locally. Use `huggingface-cli download <model-id> --local-dir /path`.

---

## Usage Tracking (Submissions)

Every call to `/deobfuscate`, `/ai-deobfuscate`, `/generate-report`, and `/local-deobfuscate` increments `users.submissions` for the requesting user via `db.increment_submissions(username)`.

`GET /leaderboard` returns the top 3 users by submissions. Shown at the bottom of the main page as a medal podium (🥇🥈🥉).

Admin panel shows the submission count per user.

---

## Frontend Architecture

### Single-file React app (`App.js`)

All components are in one file. Components:

| Component | Role |
|-----------|------|
| `LoginPage` | Sign-in / sign-up toggle, JWT handling |
| `DeobfuscatePage` | Main deobfuscation tab (rule-based, report, AI) |
| `LabPage` | Lab tab: local model inference + training pairs |
| `SettingsModal` | AI provider config, logo upload, pepper (admin-only write) |
| `AdminPanel` | User list with approve/role/delete + submissions count |
| `GearMenu` | Dropdown: Settings, Admin Panel, Log out |
| `NotificationsPanel` | Bell icon (admin only), polls `/notifications` every 60s |
| `InstructionsModal` | Paper icon, shows full setup guide inline |
| `WelcomeBanner` | Toast shown on every login, GitHub link |
| `App` | Root: auth state, theme, leaderboard, tab routing |

### Theming

`darkMode` boolean controls a `theme` object passed as prop. CSS custom properties `--btn-bg`, `--btn-text`, `--btn-border` are set inline on the root div and consumed by `.deotter-btn` in App.css.

```css
.deotter-btn {
  border-radius: 20px;
  background-color: var(--btn-bg);
  color: var(--btn-text);
  border: 1px solid var(--btn-border);
}
.deotter-btn:hover:not(:disabled) { filter: brightness(0.82); }
```

### Auth state

Stored in `localStorage`:
- `deotter_token` — JWT string
- `deotter_user` — `{ username, role }` JSON

### Training pairs

Stored in `localStorage.deotter_pairs` as a JSON array. Never sent to server unless "Use training pairs" checkbox is ticked. Only last 5 sent in AI prompts (to limit token usage).

### Logo system

- Light mode: `999fbba3-83ed-4298-ba83-0747b9bfd1cc-2.png`
- Dark mode: `deotterlogo_whitecontour.png`
- Admin can override with any PNG/JPG uploaded via Settings, stored as `logo_override` in the settings DB.
- "DeOtter" text rendered below logo in React (not baked into PNG).

---

## API Endpoints Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | ❌ | Returns JWT on valid credentials |
| POST | `/auth/register` | ❌ | Creates pending user |
| GET | `/auth/me` | ✅ | Returns current user info |
| POST | `/deobfuscate` | ✅ | Rule-based deobfuscation |
| POST | `/generate-report` | ✅ | Obfuscation technique report |
| POST | `/ai-deobfuscate` | ✅ | AI deobfuscation via cloud provider |
| POST | `/local-deobfuscate` | ✅ | AI deobfuscation via local model |
| GET | `/local-model-status` | ✅ | Status of loaded local model |
| GET | `/available-models` | ✅ | List of configured local models |
| POST | `/load-model` | ✅ | Load a local model into memory |
| GET | `/leaderboard` | ✅ | Top 3 users by submissions |
| GET | `/notifications` | ✅ (admin) | Pending user approvals |
| GET | `/admin/users` | ✅ (admin) | All users with submissions |
| POST | `/admin/users/<u>/approve` | ✅ (admin) | Approve pending user |
| POST | `/admin/users/<u>/role` | ✅ (admin) | Change user role |
| DELETE | `/admin/users/<u>` | ✅ (admin) | Delete user |
| GET | `/settings/ai` | ✅ | AI provider config (keys masked) |
| POST | `/settings/ai` | ✅ (admin) | Save AI provider config |
| GET | `/settings/pepper` | ✅ (admin) | Get current pepper |
| POST | `/settings/pepper` | ✅ (admin) | Save new pepper |
| GET | `/settings/logo-files` | ✅ | List available logo files |
| POST | `/settings/upload-logo` | ✅ (admin) | Upload new logo |
| POST | `/settings/clear-logo` | ✅ (admin) | Reset to default logo |

---

## Deployment Notes

### macOS port conflict

Port 5000 is used by macOS AirPlay Receiver (ControlCenter process). Flask runs on **5001** to avoid the conflict. Disable AirPlay Receiver in System Settings → General → AirDrop & Handoff if you want to use 5000.

### Running in production

- Set `DEOTTER_SECRET` to a strong random string and never change it (changing it invalidates all active sessions).
- Disable Flask debug mode: change `debug=True` to `debug=False` in `app.py`.
- Use a proper WSGI server (gunicorn, uWSGI) instead of Flask's dev server.
- Put nginx in front of both Flask and the React build.
- Build the React app: `cd frontend && npm run build` — serves as static files.

---

## Company Email / SSO (Future Work)

### Option A — Domain restriction (easiest, 5 min)

In `auth.py`, inside `/auth/register`, add:

```python
ALLOWED_DOMAIN = os.environ.get("ALLOWED_EMAIL_DOMAIN", "")
if ALLOWED_DOMAIN and not email.endswith(f"@{ALLOWED_DOMAIN}"):
    return jsonify({"error": f"Only @{ALLOWED_DOMAIN} addresses are accepted"}), 403
```

```bash
export ALLOWED_EMAIL_DOMAIN=acme.com
```

### Option B — Email verification

1. Create user with `status="pending"`.
2. Generate `secrets.token_urlsafe(32)`, store in DB, email verification link.
3. On click, set `status="active"`.
4. Currently the admin-approval system already does step 1 and 4 — extend with email instead.

### Option C — SSO (SAML 2.0 / OIDC)

SAML: `pip install python3-saml` — routes: `/auth/saml/login`, `/auth/saml/acs`, `/auth/saml/metadata`.  
OIDC: `pip install authlib requests` — redirect to provider, exchange code for ID token, create local user.  
Both require registration with IT team and IdP configuration.

---

## Known Issues / Limitations

- Local models must be downloaded manually — no in-app download.
- Training pairs are browser-local (localStorage) — no server-side sync.
- No rate limiting on AI endpoints — any authenticated user can call them freely.
- `users.db` is a single file — not suitable for multi-server deployments without a shared mount.

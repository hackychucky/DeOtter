# DeOtter – Developer Notes

## How the Anthropic API Key Works

### What is an API key?

An API key is a secret credential that identifies **you** to Anthropic's servers.
When DeOtter sends a JavaScript snippet to Claude for deobfuscation, it includes your
API key in the request so Anthropic knows who is making the call and can charge your
account for the usage.

Think of it like a password: it grants access to a paid service under your name.

---

### Is the key mine, or can others use their own?

**The key is yours and yours alone.**

- It is tied to your Anthropic account and your billing.
- Every request made with it is charged to you.
- If you share the key, whoever has it can make requests at your expense.

If you want other people to use DeOtter with AI, there are two options:

| Option | How it works |
|--------|--------------|
| **Each user sets their own key** | They sign up at console.anthropic.com, get their own key, and set `ANTHROPIC_API_KEY` in their own environment. Zero cost to you. |
| **You host a backend** | You keep your key on a server you control. Users hit your server, which calls Claude on their behalf. You pay the bill and can add rate limits or authentication. |

For personal/local use, just set your own key. For a shared deployment, never expose the
key to the browser or frontend — keep it server-side only (which is already the case in
this project: the key lives in the Flask backend, not in the React frontend).

---

### How to get your API key

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in.
3. Navigate to **API Keys** in the left sidebar.
4. Click **Create Key**, give it a name (e.g. `deotter-local`), and copy it.

The key looks like: `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

### How to set the key so DeOtter can use it

**Option A – Environment variable (recommended for local use):**

```bash
# macOS / Linux — run this before starting Flask
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxx...

# Windows (Command Prompt)
set ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxx...

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="sk-ant-api03-xxxxxxxx..."
```

Then start the Flask backend normally:

```bash
cd backend
python app.py
```

**Option B – `.env` file (more convenient):**

Create a file at `backend/.env` with this content:

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxx...
```

Then install `python-dotenv`:

```bash
pip install python-dotenv
```

And add these two lines at the very top of `backend/app.py` (before everything else):

```python
from dotenv import load_dotenv
load_dotenv()
```

Flask will now read the key automatically every time it starts.

---

### Why you must NEVER commit the key to git

If you push your API key to GitHub (even in a private repo), automated bots scan public
repositories 24/7 and will find it within minutes. Someone else will then use it at your
expense — or Anthropic will detect the leak and revoke it.

The `.env` file is already listed in `.gitignore` in this project, so git will ignore it.
**Never hardcode the key directly in `app.py` or any source file.**

---

### Pricing

Anthropic charges per token (roughly per word). Deobfuscating a short JS snippet costs
fractions of a cent. You can monitor usage and set spending limits in the
[Anthropic console](https://console.anthropic.com).

---

---

## How Training Pairs Storage Works (localStorage)

### What is localStorage?

`localStorage` is a small key-value database built into every web browser. It has nothing
to do with your server or your project files — the data lives on the **user's own machine**,
inside their browser profile, tied to the domain of the website they are visiting.

Key properties:
- Survives page refreshes and browser restarts (no expiry).
- Completely invisible to the server unless your code explicitly reads it and sends it in a request.
- Each browser on each device has its own independent localStorage — data does not sync.
- Storage limit is typically ~5 MB per domain, more than enough for training pairs.

### How DeOtter uses it

DeOtter stores all training pairs under a single localStorage key: `"deotter_pairs"`.

The data looks like this inside the browser:

```
Key:   deotter_pairs
Value: [{"obfuscated":"var _0x1a2b=...","clean":"var config = ..."},...]
```

**Writing:** Whenever you click **Good — Save as Training Pair** or **Add Training Pair**
in the Train tab, the updated list is serialised to JSON and written to `localStorage`.

**Reading:** When the app first loads in the browser, it reads `localStorage.getItem("deotter_pairs")`
and restores the list into memory. This is why your pairs survive a page refresh — they
were never in RAM to begin with, they were on disk in the browser's storage.

**Sending to Flask:** The pairs are **never transmitted to the backend automatically**.
They only get sent when you tick the **"Use training pairs"** checkbox before clicking
**Deobfuscate using DeOtter AI**. Even then, only the last 5 pairs are sent (the backend
uses them as examples in the prompt — sending more would just waste tokens for no gain).

### What this means in practice

| Scenario | What happens to your pairs |
|---|---|
| You refresh the page | Pairs are safe — read back from localStorage on reload |
| You open DeOtter in another browser | Pairs are NOT there — localStorage is per-browser |
| You open DeOtter on another device | Pairs are NOT there — localStorage is per-machine |
| You click AI deobfuscate, checkbox OFF | Pairs stay in browser, nothing sent to server |
| You click AI deobfuscate, checkbox ON | Last 5 pairs sent to Flask for that request only |
| Flask / backend restarts | Pairs unaffected — they live in the browser |

### Backing up and sharing pairs

Because localStorage is local to one browser, the only way to back up or move your pairs is
the **Download Training Pairs** button in the Train tab. It generates a `training_pairs.json`
file from whatever is currently stored. Keep this file safe — it is your dataset.

If you ever want to restore pairs (e.g. on a new machine), you would need to import them
back. DeOtter does not have an import button yet, but you can open the browser console
(`F12 → Console`) and run:

```javascript
localStorage.setItem("deotter_pairs", JSON.stringify([ /* paste your pairs array here */ ]));
location.reload();
```

---

### What happens when the button is clicked

1. The React frontend sends the obfuscated JS to `POST /ai-deobfuscate` on the Flask backend.
2. Flask reads `ANTHROPIC_API_KEY` from the environment.
3. Flask calls the Anthropic API with a prompt asking Claude to deobfuscate the code.
4. Claude returns clean, readable JavaScript.
5. Flask forwards that code back to the frontend, which displays it in the output panel.

The key never touches the browser. The browser only talks to your local Flask server
(`http://127.0.0.1:5000`).

---

## Users Management

### Overview

DeOtter has a built-in user system designed for company/team deployments. Features:

- **Login page** with the DeOtter logo loads before the app.
- Two roles: **admin** and **user** (same app access for now, foundation for future restrictions).
- Authenticated sessions via **JWT tokens** (8-hour expiry, stored in localStorage).
- All API endpoints are protected — unauthenticated requests return `401`.

---

### Where the database lives

The user database is a single SQLite file:

```
backend/users.db
```

It is created **automatically** the first time Flask starts, so you do not need to do anything special. It is listed in `.gitignore` and will never be committed to git — each deployment manages its own users.

---

### Default admin account

On first startup, if the database is empty, DeOtter creates a default administrator:

| Username | Password |
|----------|----------|
| `admin`  | `admin`  |

**Change this password immediately** in any real deployment (see CLI below).

---

### Managing users — CLI tool

All user management is done via `backend/manage_users.py`. Always run it from the `backend/` directory with the venv activated.

```bash
cd backend
source venv/bin/activate      # macOS / Linux
venv\Scripts\activate         # Windows
```

#### List all users

```bash
python manage_users.py list
```

Output example:
```
ID    Username             Role
-----------------------------------
1     admin                admin
2     alice                user
3     bob                  user
```

#### Create a user

```bash
python manage_users.py create <username> <password>
python manage_users.py create alice secret123
python manage_users.py create bob pass456 --role admin
```

Default role is `user`. Pass `--role admin` for administrators.

#### Delete a user

```bash
python manage_users.py delete alice
```

You will be asked to confirm before deletion.

#### Change a password

```bash
python manage_users.py password alice newpassword123
```

---

### How authentication works (technical)

1. The React frontend shows a login form before anything else.
2. On submit, it calls `POST /auth/login` with `{ username, password }`.
3. Flask verifies credentials against the SQLite database (passwords are hashed with bcrypt via `werkzeug`).
4. On success, Flask returns a **JWT token** signed with `DEOTTER_SECRET` (8-hour expiry).
5. The token is stored in `localStorage` under `deotter_token`.
6. Every subsequent API call includes `Authorization: Bearer <token>` in the request headers.
7. The `@require_auth` decorator on each Flask route validates the token before processing.
8. On logout (gear icon → Log out), the token is removed from localStorage and the login page reappears.

---

### Setting the JWT secret key

For security, set a strong secret before deploying:

```bash
export DEOTTER_SECRET=some-long-random-string-here
```

If not set, Flask falls back to `"deotter-change-me-in-production"` — fine for local use, insecure for shared servers.

---

### Required Python packages

```bash
pip install PyJWT werkzeug
```

Both are already installed in the project venv.

---

### Files involved

| File | Purpose |
|------|---------|
| `backend/db.py` | SQLite setup, CRUD functions, password hashing |
| `backend/auth.py` | JWT token generation, `@require_auth` decorator, `/auth/login` and `/auth/me` endpoints |
| `backend/manage_users.py` | CLI tool for listing, creating, deleting, and changing passwords |
| `backend/users.db` | The database file (auto-created, gitignored) |

---

## Company Email Restriction and SSO

### Option A — Restrict registration to a company email domain

The simplest approach for a company deployment: reject any sign-up that does not use your corporate email domain. This is a one-line check in `backend/auth.py` inside the `/auth/register` endpoint:

```python
ALLOWED_DOMAIN = os.environ.get("ALLOWED_EMAIL_DOMAIN", "")  # e.g. "acme.com"

# Inside /auth/register, after the basic email format check:
if ALLOWED_DOMAIN and not email.endswith(f"@{ALLOWED_DOMAIN}"):
    return jsonify({"error": f"Only @{ALLOWED_DOMAIN} email addresses are accepted"}), 403
```

Set the domain in your environment:
```bash
export ALLOWED_EMAIL_DOMAIN=acme.com
```

This blocks self-registration from any address outside the domain. Admins can still create accounts for any user via the CLI (the CLI bypasses the email check).

---

### Option B — Email verification before activation

A domain restriction alone does not guarantee the person owns the email. For higher assurance, add an email verification step:

1. On sign-up, create the user with `active = 0` (add an `active` column to the DB).
2. Generate a random token (e.g. `secrets.token_urlsafe(32)`), store it in the DB alongside the user, and email a link like `https://yourserver/auth/verify?token=...` using Python's `smtplib` or a service like SendGrid.
3. When the link is clicked, set `active = 1` and delete the token.
4. The `/auth/login` endpoint checks `active = 1` before issuing a JWT — inactive accounts cannot log in.

This flow is standard but adds complexity. For most internal company deployments, a domain restriction (Option A) is sufficient since everyone already has a corporate email account.

---

### Option C — Single Sign-On (SSO)

SSO lets users log in with their existing company identity (Active Directory, Google Workspace, Okta, etc.) instead of a separate DeOtter password. Users click "Sign in with [Company]" and are redirected to their identity provider (IdP). No DeOtter password is ever created or stored.

There are two main SSO protocols:

#### SAML 2.0 — enterprise standard (Active Directory, ADFS, Okta, Azure AD)

How it works:
1. User clicks "Sign in with [Company]" in the DeOtter login page.
2. Flask redirects them to the company's IdP (e.g. Okta, Azure AD).
3. The IdP authenticates the user (company password, MFA, etc.).
4. The IdP sends a signed XML assertion back to Flask via the browser.
5. Flask validates the signature, extracts the username/email, and issues a DeOtter JWT.

Python library: [`python3-saml`](https://github.com/SAML-Toolkits/python3-saml)

```bash
pip install python3-saml
```

Key Flask routes to add:
- `GET /auth/saml/login` — redirects to the IdP
- `POST /auth/saml/acs` — receives and validates the SAML assertion, returns JWT
- `GET /auth/saml/metadata` — exposes your service provider metadata (needed by the IdP admin)

The IdP admin needs your metadata XML to configure the trust relationship.

---

#### OAuth2 / OpenID Connect (OIDC) — Google Workspace, Azure AD, Okta, GitHub

More modern, REST-based alternative to SAML. Works with any provider that supports OAuth2.

How it works:
1. User clicks "Sign in with Google/Microsoft/Okta".
2. Flask redirects to the provider's authorization endpoint.
3. User authenticates on the provider's site.
4. Provider redirects back with an authorization code.
5. Flask exchanges the code for an ID token containing the user's email and name.
6. Flask validates the token, creates a local user record if needed, and issues a DeOtter JWT.

Python library: [`authlib`](https://authlib.org/) (works with Flask, supports all major providers)

```bash
pip install authlib requests
```

Each provider gives you a **Client ID** and **Client Secret** when you register the app in their developer console. Store these as environment variables:

```bash
export OAUTH_CLIENT_ID=...
export OAUTH_CLIENT_SECRET=...
```

---

#### Which to choose?

| Scenario | Recommendation |
|----------|----------------|
| Microsoft Active Directory / ADFS on-premise | SAML 2.0 |
| Azure AD (cloud) | Either — OIDC is simpler |
| Google Workspace | OIDC |
| Okta | Either — Okta supports both |
| No IT department, small team | Domain restriction (Option A) |

For most modern company deployments, **OIDC with Azure AD or Google Workspace** is the easiest path. For large enterprises with on-premise AD, **SAML 2.0** is typically required by the IT team.

SSO implementation is a multi-day project and requires coordination with your IT/identity team to register the application and configure the trust. The domain restriction (Option A) can be added in 5 minutes and covers most internal deployment needs.

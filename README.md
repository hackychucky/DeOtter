# DeOtter 🐙

![DeOtter logo](images/deotterlogo.png)

> JavaScript deobfuscation tool for Cyber Security Analysts.  
> Rule-based engine + AI-powered analysis via Claude (Anthropic).  
> Developed with ❤️ from Spain by **[@HackyChucky](https://github.com/hackychucky)**

---

## Features

| Feature | Details |
|---|---|
| **User authentication** | Login / sign-up system with admin and user roles |
| **Rule-based deobfuscation** | Decodes hex, base64, string arrays, arithmetic — no AI needed |
| **Obfuscation report** | Detects 10 techniques and generates a detailed analysis |
| **AI deobfuscation** | Powered by Claude (Anthropic API) |
| **Training pair system** | Save good/bad results to teach the AI your patterns |
| **Pattern-aware AI** | Detected techniques guide which training examples are sent to Claude |
| **Syntax-highlighted editor** | Input and output with JS highlighting |
| **Training data portability** | Download and upload training pairs as JSON |
| **Dark / light mode** | Full theme support, persisted across sessions |

---

## Detection Techniques

The report engine detects the following obfuscation techniques:

- `\x` hex escapes and `\u` / `\u{…}` Unicode escapes
- Base64-encoded strings (validated by decoding, no false positives)
- String array mapping — including `_0x####` obfuscator.io style
- String concatenation chains (`"a"+"b"+"c"`)
- Dead code — unused variables, unused functions, unreachable blocks
- Obfuscated variable names — `_0x` pattern, vowel-free names, cryptic identifiers
- Control flow obfuscation — nested structures, switch dispatchers, comma chains
- Arithmetic obfuscation
- Minification
- Dynamic code generation (`eval`, `new Function`, `fetch`, etc.)

---

## Project Structure

```
DeOtter/
├── backend/
│   ├── app.py               # Flask API
│   ├── deotter.py           # Detection & deobfuscation engine
│   ├── auth.py              # JWT authentication endpoints
│   ├── db.py                # SQLite user database
│   ├── manage_users.py      # CLI user management tool
│   └── models_config.json   # Local model paths (optional)
├── frontend/
│   ├── src/
│   │   ├── App.js           # React UI
│   │   └── ...
│   └── package.json
├── notes.md                 # Technical notes
└── README.md
```

---

## Quick Start — VS Code on any machine

These are the exact commands to get DeOtter running from scratch on a server or a new machine using VS Code.

### Prerequisites

Install these first if not already present:

| Tool | Version | Download |
|------|---------|----------|
| Git | any | https://git-scm.com |
| Python | 3.9+ | https://python.org |
| Node.js | 16+ | https://nodejs.org |
| VS Code | any | https://code.visualstudio.com |

On **Ubuntu / Debian** you can install all at once:

```bash
sudo apt update && sudo apt install -y git python3 python3-pip python3-venv nodejs npm
```

---

### Step 1 — Clone and open in VS Code

```bash
git clone https://github.com/hackychucky/deotter.git
cd DeOtter
code .
```

VS Code will open the project. Use its integrated terminal (`Ctrl+` `` ` ``) for the remaining steps.

---

### Step 2 — Set up the backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows

# Install all dependencies
pip install flask flask-cors anthropic openai PyJWT werkzeug
```

---

### Step 3 — Set environment variables

DeOtter supports two AI providers. Set **one** of the two blocks below depending on which you use.

#### Option A — Azure AI Foundry (recommended for company deployments)

```bash
export AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/
export AZURE_OPENAI_API_KEY=your-azure-key
export AZURE_OPENAI_DEPLOYMENT=gpt-4o        # your deployment name in Foundry
# export AZURE_OPENAI_API_VERSION=2024-12-01-preview  # optional, this is the default
```

On **Windows (Command Prompt)**:
```cmd
set AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/
set AZURE_OPENAI_API_KEY=your-azure-key
set AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

On **Windows (PowerShell)**:
```powershell
$env:AZURE_OPENAI_ENDPOINT="https://YOUR-RESOURCE.openai.azure.com/"
$env:AZURE_OPENAI_API_KEY="your-azure-key"
$env:AZURE_OPENAI_DEPLOYMENT="gpt-4o"
```

> See `notes.md` → *Azure AI Foundry* for how to find these values in the Azure portal.

#### Option B — Anthropic / Claude (for personal or direct API use)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

#### Always set — JWT secret

```bash
export DEOTTER_SECRET=some-long-random-string
```

> If both Azure and Anthropic variables are set, **Azure AI Foundry takes priority**.  
> To make variables permanent, add them to your shell profile (`~/.bashrc`, `~/.zshrc`) or a `.env` file.

---

### Step 4 — Start the backend

```bash
python3 app.py
```

Flask starts at `http://127.0.0.1:5000`. The user database (`users.db`) is created automatically on first run.

**Default login credentials:**

| Username | Password |
|----------|----------|
| `admin` | `admin` |

> ⚠️ Change the admin password immediately after first login:
> ```bash
> python3 manage_users.py password admin yournewpassword
> ```

---

### Step 5 — Set up and start the frontend

Open a **second terminal** in VS Code (`+` button in the terminal panel):

```bash
cd frontend
npm install
npm start
```

Frontend opens automatically at `http://localhost:3000`.

> Both servers must be running at the same time. Keep both terminal tabs open.

---

### Full command sequence (copy-paste for Linux/macOS)

**With Azure AI Foundry:**
```bash
git clone https://github.com/hackychucky/deotter.git
cd DeOtter/backend
python3 -m venv venv && source venv/bin/activate
pip install flask flask-cors anthropic openai PyJWT werkzeug
export AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/
export AZURE_OPENAI_API_KEY=your-azure-key
export AZURE_OPENAI_DEPLOYMENT=gpt-4o
export DEOTTER_SECRET=change-this-to-something-random
python3 app.py &
cd ../frontend && npm install && npm start
```

**With Anthropic / Claude:**
```bash
git clone https://github.com/hackychucky/deotter.git
cd DeOtter/backend
python3 -m venv venv && source venv/bin/activate
pip install flask flask-cors anthropic openai PyJWT werkzeug
export ANTHROPIC_API_KEY=sk-ant-...
export DEOTTER_SECRET=change-this-to-something-random
python3 app.py &
cd ../frontend && npm install && npm start
```

---

## Managing Users

DeOtter includes a CLI tool for user management. Run it from the `backend/` directory with the venv activated.

```bash
cd backend
source venv/bin/activate

python3 manage_users.py list                                      # list all users
python3 manage_users.py create alice secret123                    # create user
python3 manage_users.py create bob pass456 --role admin           # create admin
python3 manage_users.py password alice newpassword                # change password
python3 manage_users.py delete alice                              # delete user
```

See `notes.md` → *Users Management* for full details, including SSO and company email restriction.

---

## How to Use

### Deobfuscate tab

1. Log in with your credentials.
2. Paste obfuscated JavaScript into the editor.
3. Choose an action:
   - **Deobfuscate** — rule-based engine, no API key required
   - **Create Obfuscation Report** — detailed technique breakdown
   - **Deobfuscate using DeOtter AI** — sends code to Claude for AI-powered analysis
4. After any result, **Good / Bad** buttons appear:
   - **Good** — saves the input + output as a training pair (stored in your browser)
   - **Bad** — discards the output

#### AI with training pairs

Tick **"Use training pairs (N)"** next to the AI button to include your saved examples in the Claude prompt. The engine automatically selects the examples whose detected techniques match the current code.

---

### Train tab

Build your personal training dataset to improve AI results over time.

| Button | What it does |
|---|---|
| **Add Training Pair** | Saves the current obfuscated + clean pair to your list |
| **Download Training Pairs** | Exports your full dataset as `training_pairs.json` |
| **Upload Training Pairs** | Imports a `.json` file and merges it with your existing pairs |
| **Clear Pairs** | Removes all pairs from the current session |

Training pairs are stored in your **browser's localStorage** — they persist across page refreshes and are never sent to the server unless you explicitly use them with the AI button. See `notes.md` for details.

---

## Notes

- The Flask backend must be running before using the frontend.
- AI deobfuscation requires `ANTHROPIC_API_KEY` to be set in the environment where Flask runs.
- Set `DEOTTER_SECRET` to a permanent value to avoid session expiry on Flask restarts.
- Training pairs are local to the browser — use **Download** to back them up or move them to another machine.
- Rule-based deobfuscation and report generation work fully offline with no API key.

---

## Contact

Made with ❤️ by **[@HackyChucky](https://github.com/hackychucky)**

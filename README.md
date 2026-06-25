# DeOtter 🐙

![DeOtter logo](images/deotterlogo.png)

> JavaScript deobfuscation tool for Cyber Security Analysts.  
> Rule-based engine + AI-powered analysis (Anthropic, Azure AI Foundry, OpenAI, or local models).  
> Developed with ❤️ from Spain by **[@HackyChucky](https://github.com/hackychucky)**

---

## Features

| Feature | Details |
|---|---|
| **User authentication** | Login / sign-up with admin approval, admin and user roles |
| **Rule-based deobfuscation** | Decodes `\x` hex, `\u` unicode, base64, string arrays, arithmetic |
| **Obfuscation report** | Detects 10 techniques and generates a detailed analysis |
| **AI deobfuscation** | Anthropic Claude, Azure AI Foundry, or OpenAI |
| **Local model inference** | Run local LLMs (CodeT5, StarCoder, Mistral, etc.) via the LMI tab |
| **Training pair system** | Save good/bad AI results to teach the model your patterns |
| **Pattern-aware AI** | Detected techniques guide which training examples are sent to the AI |
| **Syntax-highlighted editor** | Input and output with JS highlighting |
| **Dark / light mode** | Full theme support, persisted across sessions |
| **Top Deobfuscators** | Submission leaderboard shown on the main page |
| **Admin panel** | Approve users, change roles, view usage stats |
| **Password pepper** | Server-side secret appended before hashing, configurable in Settings |
| **Custom logo** | Upload a custom logo via Settings (admin only) |

---

## Detection Techniques

- `\x` hex escapes and `\u` / `\u{…}` Unicode escapes
- Base64-encoded strings (validated by decoding)
- String array mapping — including `_0x####` obfuscator.io style
- String concatenation chains (`"a"+"b"+"c"`)
- Dead code — unused variables, functions, unreachable blocks
- Obfuscated variable names — `_0x` pattern, vowel-free names
- Control flow obfuscation — nested structures, switch dispatchers
- Arithmetic obfuscation
- Minification
- Dynamic code generation (`eval`, `new Function`, `fetch`, etc.)

---

## Rule-based engine — what it can and cannot do

The **Deobfuscate** button runs a regex-based engine. It handles:

| What | Example |
|---|---|
| `\x` hex escapes | `\x68\x65\x6c\x6c\x6f` → `hello` |
| `\uNNNN` Unicode escapes | `\u0068\u0065\u006c\u006c\u006f` → `hello` |
| `\u{NNNNN}` extended escapes | `\u{1F600}` → `😀` |
| Inline base64 strings | `aGVsbG8=` → `hello` |
| Simple string arrays | `var a=["eval","doc"]; a[0]` → `"eval"` |
| Arithmetic | `3+5` → `8` |

It **cannot** handle code produced by obfuscator.io or similar tools that use decoder functions (`_0x####('0x1a','key')`), self-bootstrapping array shufflers, or control-flow flattening. For those, use **Deobfuscate using DeOtter AI**.

---

## Project Structure

```
DeOtter/
├── backend/
│   ├── app.py               # Flask API (all endpoints)
│   ├── deotter.py           # Detection & deobfuscation engine
│   ├── auth.py              # JWT authentication
│   ├── db.py                # SQLite database + helpers
│   ├── manage_users.py      # CLI user management tool
│   └── models_config.json   # Local model paths (optional)
├── frontend/
│   ├── src/
│   │   ├── App.js           # React UI
│   │   └── App.css          # Global styles
│   └── package.json
└── README.md
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Git | any |
| Python | 3.9+ |
| Node.js | 16+ |

On **Ubuntu / Debian**:
```bash
sudo apt update && sudo apt install -y git python3 python3-pip python3-venv nodejs npm
```

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/hackychucky/deotter.git
cd DeOtter
```

---

### Step 2 — Set up the backend

```bash
cd backend
python3 -m venv venv
pip install flask flask-cors anthropic openai PyJWT werkzeug
```

> No need to activate the venv manually — `npm start` uses it directly.

---

### Step 3 — Configure an AI provider

Choose one of the options below. You can also configure everything through the Settings UI (gear icon) after logging in — no environment variables needed.

#### Option A — Anthropic / Claude

Get your API key at [console.anthropic.com](https://console.anthropic.com).

```bash
export ANTHROPIC_API_KEY=sk-...
```

#### Option B — Azure AI Foundry

Go to [ai.azure.com](https://ai.azure.com) → Deployments → your deployment → copy Endpoint, Deployment Name, and API Key.

```bash
export AZURE_FOUNDRY_ENDPOINT=https://YOUR-RESOURCE.services.ai.azure.com/openai/v1
export AZURE_FOUNDRY_DEPLOYMENT=your-deployment-name
export AZURE_FOUNDRY_API_KEY=your-azure-key
```

#### Option C — OpenAI

Get your API key at [platform.openai.com](https://platform.openai.com).

```bash
export OPENAI_API_KEY=sk-...
```

#### Provider priority (auto-detect when using env vars)

| Azure vars set | Anthropic var set | OpenAI var set | Provider used |
|:-:|:-:|:-:|---|
| ✅ | any | any | **Azure AI Foundry** |
| ❌ | ✅ | any | **Anthropic / Claude** |
| ❌ | ❌ | ✅ | **OpenAI** |
| ❌ | ❌ | ❌ | Error — configure via Settings UI |

#### Always recommended — JWT secret

```bash
export DEOTTER_SECRET=some-long-random-string
```

> If not set, Flask falls back to a hardcoded default (insecure for shared servers).

---

### Step 4 — Start the app

From the `frontend/` folder — starts both Flask (port 5001) and React (port 3000) together:

```bash
cd frontend
npm install
npm start
```

The app opens at **`http://localhost:3000`**.

> **macOS AirPlay conflict**: macOS AirPlay Receiver occupies port 5001. Either disable it in  
> **System Settings → General → AirDrop & Handoff → AirPlay Receiver**, or run Flask on a different port:
> ```bash
> export PORT=5050
> npm start
> ```

---

### Step 5 — First-login security setup

On a fresh install, one default admin account is created:

| Username | Password |
|----------|----------|
| `admin` | `pa$$w0rd` |

**Change the password immediately** using the CLI:

```bash
cd backend
python3 manage_users.py password admin YOUR_NEW_STRONG_PASSWORD
```

Then create your own admin account and delete the default one:

```bash
python3 manage_users.py create yourname yourpassword --role admin
python3 manage_users.py delete admin
```

---

### Full copy-paste setup (Linux/macOS — Anthropic)

```bash
git clone https://github.com/hackychucky/deotter.git
cd DeOtter/backend
python3 -m venv venv
pip install flask flask-cors anthropic openai PyJWT werkzeug
export ANTHROPIC_API_KEY=sk-...
export DEOTTER_SECRET=change-this
cd ../frontend && npm install && npm start
```

### Full copy-paste setup (Linux/macOS — Azure AI Foundry)

```bash
git clone https://github.com/hackychucky/deotter.git
cd DeOtter/backend
python3 -m venv venv
pip install flask flask-cors anthropic openai PyJWT werkzeug
export AZURE_FOUNDRY_ENDPOINT=https://YOUR-RESOURCE.services.ai.azure.com/openai/v1
export AZURE_FOUNDRY_DEPLOYMENT=your-deployment-name
export AZURE_FOUNDRY_API_KEY=your-azure-key
export DEOTTER_SECRET=change-this
cd ../frontend && npm install && npm start
```

---

## Local Model Inference (optional)

DeOtter can run local generative models via HuggingFace Transformers in the **LMI** tab.

### Install dependencies (heavy — ≈2 GB)

```bash
cd backend
pip install torch transformers
```

### Configure model paths

Edit `backend/models_config.json`:

```json
{
  "CodeT5-small": "/path/to/your/codet5-small",
  "StarCoder":    "/path/to/your/starcoder",
  "MyModel":      "/absolute/path/to/model"
}
```

Model files must be downloaded locally first (e.g. via `huggingface-cli download`).

### Compatible models

DeOtter works with any locally-downloaded HuggingFace generative model:

| Type | Examples |
|------|---------|
| `text-generation` (causal LM) | StarCoder2, Mistral 7B, CodeLlama, DeepSeek-Coder, Phi-3, Qwen2.5-Coder, LLaMA 3 |
| `text2text-generation` (seq2seq) | CodeT5, CodeT5+, T5, Flan-T5 |

> **Note:** Encoder-only models (CodeBERT, RoBERTa, BERT) cannot generate text and will fail to load.

### Usage

1. Go to the **LMI** tab.
2. Select a model from the dropdown and click **Load Model**.
3. Paste JavaScript code and click **Deobfuscate with Local Model**.

---

## Managing Users

All user management can be done via CLI from the `backend/` directory.

```bash
cd backend

python3 manage_users.py list
python3 manage_users.py create alice secret --role user
python3 manage_users.py create bob secret --role admin
python3 manage_users.py password alice newpassword
python3 manage_users.py delete alice
```

New users who sign up via the web UI start in **pending** status and need admin approval. Admins see a notification bell and can approve via the **Admin Panel** (gear icon → Admin Panel).

---

## How to Use

### Deobfuscate tab

1. Log in with your credentials.
2. Paste obfuscated JavaScript into the editor.
3. Choose an action:
   - **Deobfuscate** — rule-based engine, no API key required (see limitations above)
   - **Create Obfuscation Report** — detailed technique breakdown
   - **Deobfuscate using DeOtter AI** — sends code to the configured AI provider
4. After an AI result, **Good / Bad** buttons appear:
   - **Good** — saves the input + output as a training pair
   - **Bad** — discards the output

Tick **"Use training pairs (N)"** to include saved examples in the AI prompt. The engine selects examples matching the detected patterns in the current code.

---

### LMI tab

- **Local Model Inference**: select and load a local HuggingFace model, then run it on any JavaScript code.
- **Training Pairs**: build a dataset of obfuscated/clean pairs to improve AI prompts. Pairs are stored in the browser's localStorage. Use **Download** to back them up.

---

## Notes

- Flask runs on port **5001** by default. Override with `export PORT=XXXX` before `npm start`.
- macOS users: AirPlay Receiver occupies port 5001 — disable it or set `export PORT=5050`.
- React runs on port **3000**. Both are started together via `npm start` from `frontend/`.
- The app runs over plain **HTTP** — do not expose it on a public network without a reverse proxy.
- Set `DEOTTER_SECRET` permanently to avoid JWT expiry on Flask restarts.
- Training pairs are local to the browser — use **Download** to back them up.
- Rule-based deobfuscation and reports work fully offline with no API key.
- `users.db` is gitignored — each deployment manages its own users.

---

## Contact

Made with ❤️ by **[@HackyChucky](https://github.com/hackychucky)**

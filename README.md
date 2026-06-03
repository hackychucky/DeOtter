# DeOtter 🐙

![DeOtter logo](images/deotterlogo.png)

> JavaScript deobfuscation tool for Cyber Security Analysts.  
> Rule-based engine + AI-powered analysis via Claude (Anthropic).  
> Developed with ❤️ from Spain by **[@HackyChucky](https://github.com/hackychucky)**

---

## Features

| Feature | Details |
|---|---|
| **Rule-based deobfuscation** | Decodes hex, base64, string arrays, arithmetic — no AI needed |
| **Obfuscation report** | Detects 10 techniques and generates a detailed analysis |
| **AI deobfuscation** | Powered by Claude (Anthropic API) |
| **Training pair system** | Save good/bad results to teach the AI your patterns |
| **Pattern-aware AI** | Detected techniques guide which training examples are sent to Claude |
| **Syntax-highlighted editor** | Input and output with JS highlighting |
| **Training data portability** | Download and upload training pairs as JSON |

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
│   ├── models_config.json   # Local model paths (optional)
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── App.js           # React UI
│   │   └── ...
│   └── package.json
├── notes.md                 # Technical notes (API key, localStorage, etc.)
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.9+
- Node.js 16+

---

### 1 — Clone the repository

```bash
git clone https://github.com/hackychucky/deotter.git
cd DeOtter
```

---

### 2 — Backend (Flask)

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install flask flask-cors anthropic
```

> `transformers` and `torch` are optional — only needed if you want to load local models (CodeBERT, etc.).

#### Set your Anthropic API key

The AI deobfuscation button requires a Claude API key from [console.anthropic.com](https://console.anthropic.com).

```bash
# macOS / Linux
export ANTHROPIC_API_KEY=sk-ant-...

# Windows (Command Prompt)
set ANTHROPIC_API_KEY=sk-ant-...

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="sk-ant-..."
```

> The key is personal — tied to your account and billing. Never commit it to git.  
> See `notes.md` for a full explanation of how the API key works and how to keep it safe.

#### Start the backend

```bash
python3 app.py
```

Backend runs at `http://127.0.0.1:5000`

---

### 3 — Frontend (React)

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

> Keep both the Flask server and the React dev server running at the same time.

---

## How to Use

### Deobfuscate tab

1. Paste obfuscated JavaScript into the editor.
2. Choose an action:
   - **Deobfuscate** — rule-based engine, no API key required
   - **Create Obfuscation Report** — detailed technique breakdown
   - **Deobfuscate using DeOtter AI** — sends code to Claude for AI-powered analysis
3. After any result, **Good / Bad** buttons appear:
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
- Training pairs are local to the browser — use **Download** to back them up or move them to another machine.
- Rule-based deobfuscation and report generation work fully offline with no API key.

---

## Contact

Made with ❤️ by **[@HackyChucky](https://github.com/hackychucky)**

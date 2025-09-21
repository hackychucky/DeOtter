# DeOtter

![DeOtter logo](images/deotterlogo.png)


# 🐙 DeOtter – JavaScript Deobfuscation Tool

DeOtter is a **JavaScript deobfuscation tool** designed for **Cyber Security Analysts**.  
It allows you to:

- 🔹 Deobfuscate obfuscated JS code (no AI required)
- 🔹 Generate Obfuscation Reports
- 🔹 Train custom models
- 🔹 AI-assisted deobfuscation using pretrained models (CodeBERT or similar)
- 🔹 Load and manage multiple models
- 🔹 Use a simple syntax-highlighted editor interface

Developed with ❤️ by **@HackyChucky**.

---

## 📦 Features

- 🛠️ Deobfuscate obfuscated JavaScript
- 📊 Generate Obfuscation Reports
- 🤖 AI Deobfuscate (requires pretrained models)
- 📚 Train custom models
- 🎨 Syntax-highlighted code editor
- 📁 Model selection and loading

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

\`\`\`bash
git clone https://github.com/yourusername/deotter.git
cd deotter
\`\`\`

---

### 2️⃣ Backend Setup (Python / Flask)

Make sure you have **Python 3.9+** installed.

#### Create Virtual Environment and Install Dependencies:

\`\`\`bash
python -m venv venv
# Activate the virtual environment
source venv/bin/activate  # Linux / macOS
venv\\Scripts\\activate     # Windows

# Install Python packages
pip install flask flask-cors torch transformers
\`\`\`

#### Optional Packages for AI:

\`\`\`bash
pip install tokenizers
\`\`\`

#### Configure Models Folder

In \`app.py\` you will see a line like:

\`\`\`python
MODELS_DIR = "/path/to/your/models"
\`\`\`

- Replace \`/path/to/your/models\` with a folder on your machine.
- Each pretrained model should be in a **separate subdirectory** inside that folder.

#### Run Flask Backend

\`\`\`bash
python app.py
\`\`\`

Backend will run at: `http://127.0.0.1:5000`

---

### 3️⃣ Frontend Setup (React)

Navigate to the frontend folder and install dependencies:

\`\`\`bash
cd frontend
npm install
npm start
\`\`\`

Frontend will run at: `http://localhost:3000`

#### Frontend Packages Include:

- react
- react-dom
- react-scripts
- react-simple-code-editor
- prismjs

---

## 🖥️ How to Use

### Deobfuscate Tab

1. Paste obfuscated JS code in the editor.
2. Click **Deobfuscate** 🛠️ to get the cleaned code.
3. Click **Create Obfuscation Report** 📊 to get a summary.
4. Optional: **AI Deobfuscate** 🤖 (requires a loaded model).

> Note: **Deobfuscate & Report features do NOT require AI models**.

### Train Tab

1. Add obfuscated + clean code pairs.
2. Click **Add Training Pair** ➕.
3. Click **Train Model** 🚀.
4. Clear all pairs with **Clear Pairs** ❌.

### Model Management

1. Select a model from the dropdown.
2. Click **Load Selected Model** 📥.

---

## 📂 Directory Structure

\`\`\`text
deotter/
│
├─ app.py
├─ deotter.py
├─ models_config.json
├─ frontend/
│   ├─ src/
│   │   ├─ App.js
│   │   └─ ...
│   └─ package.json
└─ README.md
\`\`\`

---

## ⚡ Notes

- Keep the Flask server running while using the frontend.
- AI deobfuscation requires models in \`MODELS_DIR\`.
- Restart Flask or refresh the frontend if any requests fail.

---

## 🛠️ Optional: Install Pretrained Code Models (CodeBERT, etc.)

\`\`\`bash
pip install transformers torch tokenizers
\`\`\`

- Download your preferred pretrained models.
- Place each model in a separate subfolder in your configured \`MODELS_DIR\`.

---

## 📌 Contact

Made with ❤️ by **@HackyChucky**

Enjoy deobfuscating! 🐙


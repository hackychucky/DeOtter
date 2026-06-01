from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from transformers import AutoTokenizer, AutoModel
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
from deotter import gen_report_from_code #We import the gem_report_from_code function
import tempfile
import subprocess
import os
import json
import anthropic

# Load preconfigured models
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "models_config.json")
with open(CONFIG_PATH, "r") as f:
    MODEL_PATHS = json.load(f)

def build_prompt(code, pairs):
    if not pairs:
        return (
            "You are a JavaScript deobfuscation expert. "
            "Deobfuscate the following JavaScript code. "
            "Return ONLY the clean, readable JavaScript code — no explanations, no markdown, no code fences.\n\n"
            f"{code}"
        )

    examples = ""
    for i, p in enumerate(pairs[-5:], 1):
        examples += f"Example {i}:\nObfuscated:\n{p['obfuscated']}\nClean:\n{p['clean']}\n\n"

    return (
        "You are a JavaScript deobfuscation expert. "
        "Use the following examples to understand the expected style and patterns, "
        "then deobfuscate the code at the end. "
        "Return ONLY the clean, readable JavaScript code — no explanations, no markdown, no code fences.\n\n"
        f"{examples}"
        f"Now deobfuscate this:\n{code}"
    )


app = Flask(__name__)
CORS(app)  # Allows connections from React (localhost:3000)


# ------------------------------
# GENERATE REPORT ENDPOINT
# ------------------------------
@app.route('/generate-report', methods=['POST'])
def gen_report_endpoint():
    data = request.json
    code = data.get('code', '')

    if not code.strip():
        return jsonify({'error': 'No code provided'}), 400

    #return jsonify({'report': f"Received code with length: {len(code)}"})

    report = gen_report_from_code(code)  # fetching the report
    return jsonify({'report': report})


# ------------------------------
# DEOBFUSCATE ENDPOINT
# ------------------------------
@app.route('/deobfuscate', methods=['POST'])
def deobfuscate_code():
    data = request.get_json()
    code = data.get('code', '')
    deobfuscated_code = deobfuscate_from_string(code)
    return jsonify({"deobfuscated": deobfuscated_code})


# Función auxiliar para usar deobfuscate directamente sobre strings
def deobfuscate_from_string(code_str):
    # La función deobfuscate en tu deotter.py espera filename
    # Podemos simularlo usando gen_report_from_code para reportes
    # o extraer la lógica de deobfuscate directamente:
    from deotter import deobfuscate  # tu función existente
    # Crear un archivo temporal para pasarlo a deobfuscate
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w+', delete=False) as tmp_file:
        tmp_file.write(code_str)
        tmp_file_path = tmp_file.name
    result = deobfuscate(tmp_file_path)
    import os
    os.unlink(tmp_file_path)  # borrar temporal
    return result




# ------------------------------
# AI SECTION STARTS HERE
# ------------------------------

# Global VARS for the model
MODEL = None
TOKENIZER = None

# ------------------------------
# ENDPOINT FOR LOADING MODEL
# ------------------------------
@app.route("/load-model", methods=["POST"])
def load_model():
    global MODEL, TOKENIZER

    if not TRANSFORMERS_AVAILABLE:
        return jsonify({"error": "transformers/torch not installed. Local models unavailable."}), 500

    data = request.get_json()
    model_name = data.get("model_name", "")

    if model_name not in MODEL_PATHS:
        return jsonify({"error": f"Modelo '{model_name}' no encontrado en configuración."}), 400

    model_path = MODEL_PATHS[model_name]

    try:
        TOKENIZER = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
        MODEL = AutoModel.from_pretrained(model_path, local_files_only=True)
        return jsonify({"message": f"Modelo '{model_name}' cargado correctamente."})
    except Exception as e:
        return jsonify({"error": f"No se pudo cargar el modelo: {str(e)}"}), 500



# ------------------------------
# ENDPOINT FOR TRAINING PAIRS
# ------------------------------

@app.route("/train-model", methods=["POST"])
def train_model():
    try:
        data = request.get_json()
        new_pairs = data.get("pairs", [])
        return jsonify({"message": f"{len(new_pairs)} pair(s) confirmed."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------------------
# ENDPOINT FOR AI DEOBFUSCATE (Claude / Anthropic API)
# ------------------------------

@app.route("/ai-deobfuscate", methods=["POST"])
def ai_deobfuscate():
    try:
        data = request.get_json()
        code = data.get("code", "")

        if not code:
            return jsonify({"error": "No code provided"}), 400

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return jsonify({"error": "ANTHROPIC_API_KEY not set in environment"}), 500

        client = anthropic.Anthropic(api_key=api_key)
        pairs = data.get("pairs", [])
        prompt = build_prompt(code, pairs)

        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        deobfuscated = message.content[0].text
        return jsonify({"deobfuscated": deobfuscated, "examples_used": len(pairs[-5:])})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/available-models", methods=["GET"])
def available_models():
    try:
        models = list(MODEL_PATHS.keys())
        return jsonify({"models": models})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)


from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from transformers import AutoTokenizer, AutoModel
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
from deotter import (
    gen_report_from_code,
    find_hex_obfuscation,
    find_base64_obfuscation,
    find_string_array_mapping,
    find_dead_code,
    find_obfuscated_variables,
    find_control_flow_obfuscation,
    find_arithmetic_obfuscation,
    find_minification,
    find_dynamic_code_generation,
    find_string_concatenation,
)
import tempfile
import subprocess
import os
import json
from db import init_db
from auth import auth_bp, require_auth

# Load preconfigured models
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "models_config.json")
with open(CONFIG_PATH, "r") as f:
    MODEL_PATHS = json.load(f)

def detect_patterns(code):
    techniques = []
    if find_hex_obfuscation(code)["matches"]:
        techniques.append("hex encoding")
    if find_base64_obfuscation(code)["matches"]:
        techniques.append("base64 encoding")
    if find_string_array_mapping(code)["count"] > 0:
        techniques.append("string array mapping")
    if find_dead_code(code)["count"] > 0:
        techniques.append("dead code")
    if find_obfuscated_variables(code)["count"] > 0:
        techniques.append("obfuscated variable names")
    if find_control_flow_obfuscation(code)["count"] > 0:
        techniques.append("control flow obfuscation")
    if find_arithmetic_obfuscation(code)["count"] > 0:
        techniques.append("arithmetic obfuscation")
    if find_minification(code)["is_minified"]:
        techniques.append("minification")
    if find_dynamic_code_generation(code)["dynamic_code_matches"]:
        techniques.append("dynamic code generation")
    if find_string_concatenation(code)["count"] > 0:
        techniques.append("string concatenation")
    return techniques


def select_pairs(pairs, detected_patterns, max_pairs=5):
    if not pairs:
        return []
    if detected_patterns:
        matching = [
            p for p in pairs
            if any(pat in p.get("patterns", []) for pat in detected_patterns)
        ]
        if matching:
            return matching[-max_pairs:]
    return pairs[-max_pairs:]


def build_prompt(code, selected_pairs, detected_patterns):
    pattern_line = (
        f"This code uses the following obfuscation techniques: {', '.join(detected_patterns)}. "
        if detected_patterns else ""
    )

    if not selected_pairs:
        return (
            "You are a JavaScript deobfuscation expert. "
            f"{pattern_line}"
            "Deobfuscate the following JavaScript code. "
            "Return ONLY the clean, readable JavaScript code — no explanations, no markdown, no code fences.\n\n"
            f"{code}"
        )

    examples = ""
    for i, p in enumerate(selected_pairs, 1):
        pair_patterns = ", ".join(p.get("patterns", [])) or "unknown"
        examples += (
            f"Example {i} (techniques: {pair_patterns}):\n"
            f"Obfuscated:\n{p['obfuscated']}\n"
            f"Clean:\n{p['clean']}\n\n"
        )

    return (
        "You are a JavaScript deobfuscation expert. "
        f"{pattern_line}"
        "Use the following examples with similar obfuscation patterns as reference. "
        "Return ONLY the clean, readable JavaScript code — no explanations, no markdown, no code fences.\n\n"
        f"{examples}"
        f"Now deobfuscate this:\n{code}"
    )


app = Flask(__name__)
CORS(app)  # Allows connections from React (localhost:3000)
app.register_blueprint(auth_bp)
init_db()


# ------------------------------
# GENERATE REPORT ENDPOINT
# ------------------------------
@app.route('/generate-report', methods=['POST'])
@require_auth
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
@require_auth
def deobfuscate_code():
    data = request.get_json()
    code = data.get('code', '')
    detected_patterns = detect_patterns(code)
    deobfuscated_code = deobfuscate_from_string(code)
    return jsonify({"deobfuscated": deobfuscated_code, "patterns": detected_patterns})


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
@require_auth
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
@require_auth
def train_model():
    try:
        data = request.get_json()
        new_pairs = data.get("pairs", [])
        return jsonify({"message": f"{len(new_pairs)} pair(s) confirmed."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------------------
# ENDPOINT FOR AI DEOBFUSCATE (Azure AI Foundry or Anthropic)
# ------------------------------

def _call_ai(prompt):
    """
    Call whichever AI provider is configured.
    DB settings (set via the Settings UI) take priority over environment variables.
    """
    from db import get_setting

    provider = get_setting("ai_provider")  # "azure" | "anthropic" | ""

    # Credentials — DB overrides env vars
    azure_endpoint = get_setting("azure_endpoint") or os.environ.get("AZURE_OPENAI_ENDPOINT", "")
    azure_key      = get_setting("azure_key")      or os.environ.get("AZURE_OPENAI_API_KEY", "")
    azure_deploy   = get_setting("azure_deployment") or os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")
    azure_version  = get_setting("azure_version")  or os.environ.get("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    anthropic_key  = get_setting("anthropic_key")  or os.environ.get("ANTHROPIC_API_KEY", "")

    # Auto-detect provider when not explicitly set
    if not provider:
        if azure_endpoint and azure_key:
            provider = "azure"
        elif anthropic_key:
            provider = "anthropic"

    if provider == "azure":
        if not azure_endpoint or not azure_key:
            raise RuntimeError("Azure AI Foundry is selected but the endpoint or API key is not configured. Open Settings to complete the setup.")
        from openai import AzureOpenAI
        client = AzureOpenAI(azure_endpoint=azure_endpoint, api_key=azure_key, api_version=azure_version)
        response = client.chat.completions.create(
            model=azure_deploy,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096,
        )
        return response.choices[0].message.content, "azure"

    if provider == "anthropic":
        if not anthropic_key:
            raise RuntimeError("Anthropic is selected but the API key is not configured. Open Settings to complete the setup.")
        import anthropic as anthropic_module
        client = anthropic_module.Anthropic(api_key=anthropic_key)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text, "anthropic"

    raise RuntimeError(
        "No AI provider configured. An admin must open Settings and enter the API credentials."
    )


@app.route("/ai-deobfuscate", methods=["POST"])
@require_auth
def ai_deobfuscate():
    try:
        data = request.get_json()
        code = data.get("code", "")

        if not code:
            return jsonify({"error": "No code provided"}), 400

        pairs = data.get("pairs", [])
        detected_patterns = detect_patterns(code)
        selected = select_pairs(pairs, detected_patterns)
        prompt = build_prompt(code, selected, detected_patterns)

        deobfuscated, provider = _call_ai(prompt)
        return jsonify({
            "deobfuscated": deobfuscated,
            "patterns": detected_patterns,
            "examples_used": len(selected),
            "provider": provider,
        })

    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------------------
# SETTINGS ENDPOINTS
# ------------------------------

@app.route("/settings/ai", methods=["GET"])
@require_auth
def get_ai_settings():
    from db import get_setting
    anthropic_key = get_setting("anthropic_key")
    azure_key     = get_setting("azure_key")
    def hint(k):
        return f"...{k[-4:]}" if len(k) > 4 else ("set" if k else "")
    return jsonify({
        "provider":           get_setting("ai_provider") or "anthropic",
        "anthropic_key_set":  bool(anthropic_key),
        "anthropic_key_hint": hint(anthropic_key),
        "azure_endpoint":     get_setting("azure_endpoint"),
        "azure_key_set":      bool(azure_key),
        "azure_key_hint":     hint(azure_key),
        "azure_deployment":   get_setting("azure_deployment") or "gpt-4o",
        "azure_version":      get_setting("azure_version") or "2024-12-01-preview",
        "logo_override":      get_setting("logo_override") or "",
    })


@app.route("/settings/ai", methods=["POST"])
@require_auth
def save_ai_settings():
    if request.current_user.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    from db import set_setting
    data = request.get_json() or {}
    set_setting("ai_provider",    data.get("provider", "").strip())
    set_setting("azure_endpoint", data.get("azure_endpoint", "").strip())
    set_setting("azure_deployment", data.get("azure_deployment", "").strip())
    set_setting("azure_version",  data.get("azure_version", "").strip())
    if data.get("anthropic_key", "").strip():
        set_setting("anthropic_key", data["anthropic_key"].strip())
    if data.get("azure_key", "").strip():
        set_setting("azure_key", data["azure_key"].strip())
    if "logo_override" in data:
        set_setting("logo_override", data["logo_override"].strip())
    return jsonify({"message": "Settings saved."})


FRONTEND_PUBLIC = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public')


@app.route("/settings/logo-files", methods=["GET"])
@require_auth
def logo_files():
    try:
        files = sorted([
            f for f in os.listdir(FRONTEND_PUBLIC)
            if f.lower().endswith(('.png', '.jpg', '.jpeg'))
        ])
        return jsonify({"files": files})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/settings/upload-logo", methods=["POST"])
@require_auth
def upload_logo():
    if request.current_user.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "No file selected"}), 400
    from werkzeug.utils import secure_filename
    filename = secure_filename(f.filename)
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ('.png', '.jpg', '.jpeg'):
        return jsonify({"error": "Only PNG and JPG files are accepted"}), 400
    f.save(os.path.join(FRONTEND_PUBLIC, filename))
    return jsonify({"filename": filename})


@app.route("/available-models", methods=["GET"])
@require_auth
def available_models():
    try:
        models = list(MODEL_PATHS.keys())
        return jsonify({"models": models})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)


from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import subprocess
import os

app = Flask(__name__)
CORS(app)  # permite peticiones desde React

@app.route('/generate-report', methods=['POST'])
def generate_report():
    data = request.json
    code = data.get('code', '')

    if not code.strip():
        return jsonify({'error': 'No code provided'}), 400

    #return jsonify({'report': f"Received code with length: {len(code)}"})

    # Guardar el código en un archivo temporal
    with tempfile.NamedTemporaryFile(delete=False, suffix='.js', mode='w') as temp:
        temp.write(code)
        temp_filename = temp.name

    try:
        # Ejecutar deotter.py con el archivo como argumento
        result = subprocess.run(
            ['python3', 'deotter.py', temp_filename],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode != 0:
            print("Error ejecutando deotter.py:", result.stderr)  # Log para debugging
            return jsonify({'error': result.stderr}), 500

        return jsonify({'report': result.stdout})

    finally:
        os.remove(temp_filename)

if __name__ == '__main__':
    # debug=True para reiniciar automáticamente con cambios y mostrar errores
    app.run(debug=True, port=5000)

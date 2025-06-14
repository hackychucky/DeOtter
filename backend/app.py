from flask import Flask, request, jsonify
from flask_cors import CORS
from deotter import gen_report_from_code #We import the gem_report_from_code function
import tempfile
import subprocess
import os

app = Flask(__name__)
CORS(app)  # Allows connections from React (localhost:3000)

@app.route('/generate-report', methods=['POST'])
def gen_report_endpoint():
    data = request.json
    code = data.get('code', '')

    if not code.strip():
        return jsonify({'error': 'No code provided'}), 400

    #return jsonify({'report': f"Received code with length: {len(code)}"})

    report = gen_report_from_code(code)  # fetching the report
    return jsonify({'report': report})

if __name__ == '__main__':
    # debug=True para reiniciar automáticamente con cambios y mostrar errores
    app.run(debug=True)

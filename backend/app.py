from flask import Flask, request, jsonify
from flask_cors import CORS
from deotter import gen_report_from_code #We import the gem_report_from_code function
import tempfile
import subprocess
import os

app = Flask(__name__)
CORS(app)  # Allows connections from React (localhost:3000)


# Endpoint for "generate report" button
@app.route('/generate-report', methods=['POST'])
def gen_report_endpoint():
    data = request.json
    code = data.get('code', '')

    if not code.strip():
        return jsonify({'error': 'No code provided'}), 400

    #return jsonify({'report': f"Received code with length: {len(code)}"})

    report = gen_report_from_code(code)  # fetching the report
    return jsonify({'report': report})


# Endpoint for "deobfuscate" button
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



if __name__ == '__main__':
    # debug=True para reiniciar automáticamente con cambios y mostrar errores
    app.run(debug=True)

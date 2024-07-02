# DeOtter, the DeObfuscation tool for Cyber Security Analysts - Developed with ❤ from Spain by @HackyChucky
print ('Hello, this is DeOtter, the DeObfuscation tool for Cyber Security Analysts - Developed with ❤ from Spain by @HackyChucky')

# Imported Libraries
import argparse # Library for interacting with arguments through commands
import re       # Regular expressions library
import sys      # To check if the stdoutput is being passed to the report file

def show_menu():
    print("\nOPTIONS")
    print("1. OPTION 1: Analyze code obfuscation technics")
    print("2. OPTION 2: Show deobfuscated code")
    print("3. OPTION 3: Dump deobfuscated code to file")
    print("3. OPTION 4: Generate full report")
    print("5. EXIT")


def read_file():
    nombre_archivo = input("Ingresa el nombre del archivo (con extensión .txt): ")
    try:
        with open(nombre_archivo, 'r') as archivo:
            contenido = archivo.read()
            print("\nContenido del archivo:\n")
            print(contenido)
    except FileNotFoundError:
        print("El archivo no se encontró. Por favor, verifica el nombre y la ruta del archivo.")

# FUNCTION THAT SEARCHES FOR HEXADECIMAL CODE

def find_hex(content):
    # Busca y devuelve las cadenas hexadecimales encontradas en el texto
    pattern = r'\\x[0-9a-fA-F]{2}'
    hex_matches = re.findall(pattern, content)
    hex_length = sum(len(match) for match in hex_matches)
    content_length = len(content)
    hex_percentage = (hex_length / content_length) * 100 if content_length > 0 else 0
    return {
        "matches": hex_matches,
        "percentage": hex_percentage,
        "total_length": content_length,
        "hex_length": hex_length
    }


# FUNCTION THAT GENERATES REPORT

def gen_report(filename):
    try:
        with open(filename, 'r') as file:
            content = file.read()
            hex_data = find_hex(content)
            if hex_data["matches"]:
                report = f"·HEX encoding detected on file {filename}:\n"
                # Uncomment next line for showing HEX matches on report
                # report += "\n".join(hex_data["matches"]) + "\n"
                report += f" {hex_data['percentage']:.2f}% of the content of file {filename} is obfuscated using HEX encoding.\n"
            else:
                report = f"No HEX encoding detected on file {filename}.\n"
            # Print report to stdout
            print(report)
            return report
    except FileNotFoundError:
        error_message = f"El archivo {filename} no se encontró. Por favor, verifica el nombre y la ruta del archivo.\n"
        print(error_message)
        return error_message

def main():
    parser = argparse.ArgumentParser(description="Programa para desofuscar código JavaScript ofuscado")
    # Añadir argumento -r/--report para especificar el archivo
    parser.add_argument("-r", "--report", help="Generar un reporte de código hexadecimal en el archivo especificado", required=True)
    args = parser.parse_args()  # Parsear los argumentos de la línea de comandos

    if args.report:
        report_content = gen_report(args.report)
        # Write report content to a file if output redirection is used
        if report_content and not sys.stdout.isatty():
            with open(sys.stdout.name, 'w') as output_file:
                output_file.write(report_content)

if __name__ == "__main__":
     main()

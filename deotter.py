# DeOtter, the DeObfuscation tool for Cyber Security Analysts - Developed with ❤ from Spain by @HackyChucky
print ('Hello, this is DeOtter, the DeObfuscation tool for Cyber Security Analysts - Developed with ❤ from Spain by @HackyChucky')

# Imported Libraries
import argparse # Library for interacting with arguments through commands
import re       # Regular expressions library
import sys      # To check if the stdoutput is being passed to the report file
import base64   # To be able to work with b64 encoding/decoding


# FUNCTION THAT SEARCHES FOR HEXADECIMAL CODE

def find_hex_obfuscation(content):
    pattern = r'\\x[0-9a-fA-F]{2}'  # Pattern to find hexadecimal sequences like \x## (## are hexadecimal digits)
    hex_matches = re.findall(pattern, content) # Finds all matches of the pattern in the content
    hex_length = sum(len(match) for match in hex_matches) # Calculates the total length of the hexadecimal strings found
    content_length = len(content) # Calculates the total lenght of the file content
    hex_percentage = (hex_length / content_length) * 100 if content_length > 0 else 0 # Calculates the percentage

    # Returns the matches, the percentage, the total length and the lenght of the detected characters
    return {
        "matches": hex_matches,
        "percentage": hex_percentage,
        "total_length": content_length,
        "hex_length": hex_length
    }

# FUNCTION THAT SEARCHES FOR BASE64 CODE

def find_base64_obfuscation(content):
    # Pattern to find potential base64 sequences (strings of length divisible by 4, padded with '=')
    # A general pattern that matches strings with a length multiple of 4, using common base64 characters
    pattern = r'(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?'
    base64_matches = re.findall(pattern, content)  # Finds all matches of the pattern in the content

    # Filter out non-base64 valid strings (since the regex might be too broad)
    valid_base64_matches = [match for match in base64_matches if len(match) % 4 == 0]
    valid_base64_matches = [match for match in valid_base64_matches if len(match) >= 8]  # Only consider matches of 8+ characters

    base64_length = sum(len(match) for match in valid_base64_matches)  # Calculates the total length of the base64 strings found
    content_length = len(content)  # Calculates the total length of the file content
    base64_percentage = (base64_length / content_length) * 100 if content_length > 0 else 0  # Calculates the percentage

    # Returns the matches, the percentage, the total length, and the length of the detected characters
    return {
        "matches": valid_base64_matches,
        "percentage": base64_percentage,
        "total_length": content_length,
        "base64_length": base64_length
    }


# FUNCTION THAT SEARCHES FOR STRING ARRAY MAPPING
def find_string_array_mapping(content):
    pattern = r'var\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*(\[.*?\]|\'.*?\'|\".*?\");'  # Pattern to detect "var [variableName] = [string/array]"
    var_matches = re.findall(pattern, content)  # Finds all matches of the pattern in the content

    # Returns the matches and the count of string array mapping techniques detected
    return {
        "matches": var_matches,
        "count": len(var_matches)
    }

# FUNCTION THAT SEARCHES FOR DEAD CODE
def find_dead_code(content):
    # Detect unused variables
    unused_vars = re.findall(r'var\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=', content)
    used_vars = re.findall(r'\b([a-zA-Z_$][0-9a-zA-Z_$]*)\b', content)
    unused_vars = [var for var in unused_vars if var not in used_vars]

    # Detect unused functions
    function_defs = re.findall(r'function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(', content)
    function_calls = re.findall(r'\b([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(', content)
    unused_functions = [func for func in function_defs if func not in function_calls]

    # Detect unreachable code blocks (basic example, more complex analysis may be needed)
    unreachable_code_blocks = re.findall(r'if\s*\(false\)\s*\{.*?\}', content, re.DOTALL)

    return {
        "unused_vars": unused_vars,
        "unused_functions": unused_functions,
        "unreachable_code_blocks": unreachable_code_blocks,
        "count": len(unused_vars) + len(unused_functions) + len(unreachable_code_blocks)
    }

# FUNCTION THAT GENERATES REPORT
def gen_report(filename):
    try:
        with open(filename, 'r') as file:
            content = file.read()  # Reads the entire content of the specified file

            # HEX analysis
            hex_data = find_hex_obfuscation(content)  # Executes find_hex_obfuscation function to find hexadecimals in the content
            base64_data = find_base64_obfuscation(content)  # Executes find_base64_obfuscation function to find Base64 in the content
            string_array_data = find_string_array_mapping(content)  # Executes find_string_array_mapping function to detect string array mappings
            report = ""
            if hex_data["matches"]:
                report += f"·HEX encoding detected on file {filename}:\n"
                report += f" {hex_data['percentage']:.2f}% of the content of file {filename} is obfuscated using HEX encoding.\n"
            else:
                report += f"No HEX encoding detected on file {filename}.\n"

            # BASE64 analysis
            base64_data = find_base64_obfuscation(content)  # Executes find_base64_obfuscation function to find base64 in the content
            if base64_data["matches"]:
                report += f"\n·Base64 encoding detected on file {filename}:\n"
                report += f" {base64_data['percentage']:.2f}% of the content of file {filename} is obfuscated using Base64 encoding.\n"
            else:
                report += f"No Base64 encoding detected on file {filename}.\n"

            # String Array Mapping Analysis
            if string_array_data["count"] > 0:
                report += f"· String array mapping technique detected {string_array_data['count']} times:\n"
                for match in string_array_data["matches"]:
                    report += f"  var {match[0]} = {match[1]};\n"
            else:
                report += "· No string array mapping technique detected.\n"

            # Dead code detection report
            dead_code_data = find_dead_code(content)
            if dead_code_data["count"] > 0:
                report += f"·Dead code detected:\n"
                if dead_code_data["unused_vars"]:
                    report += f"  Unused variables: {', '.join(dead_code_data['unused_vars'])}\n"
                if dead_code_data["unused_functions"]:
                    report += f"  Unused functions: {', '.join(dead_code_data['unused_functions'])}\n"
                if dead_code_data["unreachable_code_blocks"]:
                    report += f"  Unreachable code blocks detected ({len(dead_code_data['unreachable_code_blocks'])}):\n"
                    for block in dead_code_data["unreachable_code_blocks"]:
                        report += f"    {block}\n"
            else:
                report += f"No dead code detected on file {filename}.\n"


            # Print report to stdout
            print(report)  # Prints the report to standard output (console)
            return report  # Returns the generated report
        
    except FileNotFoundError:
        error_message = f"File {filename} not found. Please verify filename and filepath.\n"
        print(error_message)  # Prints error message if the file is not found
        return error_message  # Returns error message
    

# FUNCTION THAT DEOBFUSCATES CODE (HEX, BASE64, String Array Mapping,)
def deobfuscate(filename):
    try:
        with open(filename, 'r') as file:
            content = file.read()  # Reads the entire content of the specified file

            # HEX deobfuscation
            hex_data = find_hex_obfuscation(content)  # Executes find_hex_obfuscation function to find hexadecimals in the content
            if hex_data["matches"]:
                for match in hex_data["matches"]:
                    # Convert each hex match to a character
                    hex_value = match.replace("\\x", "")  # Removes the \x prefix from the hexadecimal sequence
                    char = bytes.fromhex(hex_value).decode('utf-8')  # Converts the hexadecimal sequence into a character
                    content = content.replace(match, char)  # Replaces the hexadecimal sequence with the corresponding character

            # BASE64 deobfuscation
            base64_data = find_base64_obfuscation(content)  # Executes find_base64_obfuscation function to find base64 in the content
            if base64_data["matches"]:
                for match in base64_data["matches"]:
                    try:
                        decoded = base64.b64decode(match).decode('utf-8')  # Attempts to decode the base64 sequence
                        content = content.replace(match, decoded)  # Replaces the base64 sequence with the decoded content
                    except Exception as e:
                        print(f"Failed to decode base64 sequence: {match}, Error: {e}")
                        continue  # If an error occurs during decoding, skip the current match

            # String Array Mapping deobfuscation
            string_array_data = find_string_array_mapping(content)
            if string_array_data["matches"]:
                var_dict = {}
                for var_name, var_value in string_array_data["matches"]:
                    # Process the value of the array or string
                    if var_value.startswith("[") and var_value.endswith("]"):
                        # Handle the case of an array
                        elements = re.findall(r'\"(.*?)\"|\'.*?\'', var_value)  # Extracts the elements of the array
                        var_dict[var_name] = elements
                    else:
                        # Handle the case of a single string
                        var_dict[var_name] = var_value.strip('\'"')

                # Replace variable references with their values
                for var_name, var_value in var_dict.items():
                    if isinstance(var_value, list):
                        # Replace array accesses like x[0], x[1]
                        for i, item in enumerate(var_value):
                            content = re.sub(rf'\b{re.escape(var_name)}\[{i}\]\b', item, content)
                    else:
                        # Replace the variable directly if it's a string
                        content = re.sub(rf'\b{re.escape(var_name)}\b', var_value, content)


            return content  # Returns the deobfuscated content
    except FileNotFoundError:
        return f"File {filename} not found. Please, verify filename and filepath."
    

# MAIN FUNCTION

def main():
    parser = argparse.ArgumentParser(description="DeObfuscation tool for Cyber Security Analysts - Developed with ❤ from Spain by @HackyChucky")
    # Add argument -r/--report to specify the file
    parser.add_argument("-r", "--report", help="Generate a report with an Obfuscation Analysis of a given file", required=False)
    parser.add_argument("-d", "--deobfuscate", help="Deobfuscate code from the specified file", required=False)
    parser.add_argument("output_file", nargs='?', help="Output file for deobfuscation result")


    args = parser.parse_args()  # Parses commandline arguments

    if args.report:
        report_content = gen_report(args.report) # Generates report if -r/--report argument is specified
        # Write report content to a file if output redirection is used
        if report_content and not sys.stdout.isatty():
            with open(sys.stdout.name, 'w') as output_file:
                output_file.write(report_content) # Writes report content to the output file

    if args.deobfuscate:
        deobfuscated_content = deobfuscate(args.deobfuscate) # Deobfuscates content if -d/--deobfuscate argument is specified
        # Write deobfuscated content to the specified output file
        if deobfuscated_content and args.output_file:
            with open(args.output_file, 'w') as result_file:
                result_file.write(deobfuscated_content) # Writes deobfuscated content to the specified output file
        elif deobfuscated_content:
            print(deobfuscated_content)  # If no output file specified, print to stdout



if __name__ == "__main__":
     main()

# DeOtter, the DeObfuscation tool for Cyber Security Analysts - Developed with ❤ from Spain by @HackyChucky
print ('Hello, this is DeOtter, the DeObfuscation tool for Cyber Security Analysts - Developed with ❤ from Spain by @HackyChucky')

# Imported Libraries
import argparse # Library for interacting with arguments through commands
import re       # Regular expressions library
import sys      # To check if the stdoutput is being passed to the report file
import base64   # To be able to work with b64 encoding/decoding
import urllib.parse #To be able to parse urls


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

# FUNCTION THAT DETECTS OBFUSCATED VARIABLE NAMES
def find_obfuscated_variables(content):
    # Regular expression to match variable declarations
    pattern = r'\bvar\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*([^;]*)'
    matches = re.findall(pattern, content)
    
    obfuscated_vars = []
    var_values = {}

    for var_name, var_value in matches:
        # Heuristic to detect obfuscated variables
        # Variable name should be of significant length and appear non-descriptive
        if (len(var_name) > 1 and  # Variable name should be longer than 1 character
            not re.match(r'^[a-zA-Z_]\w*$', var_name) or  # Name should not be a common pattern
            re.match(r'\d{1,2}', var_value) or  # Simple numeric values often not obfuscated
            re.match(r'\[.*\]', var_value) or  # Arrays can be descriptive
            re.match(r'"[^"]*"', var_value)):  # Strings can be descriptive
            obfuscated_vars.append(var_name)
            var_values[var_name] = var_value.strip().strip('";\'')

    # Removing duplicates
    obfuscated_vars = list(set(obfuscated_vars))
    
    return {
        "matches": obfuscated_vars,
        "values": var_values,
        "count": len(obfuscated_vars)
    }


# Function to detect Control Flow Obfuscation (Spaghetti Code)
def find_control_flow_obfuscation(content):
    """
    Detects control flow obfuscation (spaghetti code) by looking for complex nested structures and unusual control flow patterns.
    """
    # Patterns to detect nested loops, unusual break/continue usage, etc.
    patterns = [
        r'if\s*\(.*\)\s*{[^}]*if\s*\(.*\)\s*{[^}]*}',  # Nested if statements
        r'for\s*\(.*\)\s*{[^}]*while\s*\(.*\)\s*{[^}]*}',  # For and while loops nested
        r'function\s+.*\(\)\s*{[^}]*function\s+.*\(\)\s*{[^}]*}',  # Nested functions
        r'\bcontinue\b[^;]*;[^}]*\bbreak\b[^;]*;'  # Unusual break/continue usage
    ]
    
    matches = []
    line_numbers = set()
    
    # Split content into lines for line number tracking
    lines = content.splitlines()
    
    for pattern in patterns:
        for match in re.finditer(pattern, content, re.DOTALL):
            # Find the line number where the match starts
            match_start = match.start()
            line_number = content.count('\n', 0, match_start) + 1
            line_numbers.add(line_number)
            matches.append(match.group())
    
    return {"count": len(matches), "matches": list(line_numbers)}

# FUNCTION TO DETECT ARITHMETIC OBFUSCATION

def find_arithmetic_obfuscation(content):
    """
    Detect arithmetic obfuscation in the given content by identifying
    common patterns of obfuscated arithmetic expressions.
    """
    arithmetic_patterns = [
        r'\b(?:\d+ \+ \d+| \d+ \* \d+| \d+ - \d+| \d+ / \d+)\b',
        r'\b(?:\d+ \+ \d+ \* \d+| \d+ \* \d+ - \d+| \d+ / \d+ + \d+)\b'
    ]
    
    matches = []
    for pattern in arithmetic_patterns:
        matches.extend(re.findall(pattern, content))
    
    count = len(matches)
    return {
        "count": count,
        "matches": matches
    }


# FUNCTION TO DETECT MINIFICATION OBFUSCATION

def find_minification(content):
    """
    Detects minification in the given content by checking for typical patterns of minified code.
    """
    # Count the number of spaces and new lines in the original content
    original_whitespace = len(re.findall(r'\s+', content))
    
    # Remove all whitespace characters from the content
    minified_content = re.sub(r'\s+', '', content)
    
    # Count the number of whitespace characters in the minified content
    minified_whitespace = len(re.findall(r'\s+', minified_content))
    
    # If there are fewer whitespace characters, it could be minified
    minification_ratio = (original_whitespace - minified_whitespace) / original_whitespace

    is_minified = minification_ratio > 0.5  # Threshold of 50% reduction in whitespace to consider as minified

    return {
        "is_minified": is_minified,
        "original_length": len(content),
        "cleaned_length": len(minified_content),
        "whitespace_ratio": minification_ratio
    }


# FUNCTION TO DETECT DYNAMIC CODE GENERATION


    
def find_dynamic_code_generation(content):
    """
    Detects dynamic code generation and potential C&C server addresses in the given content.
    """
    # Patterns for detecting dynamic code generation
    patterns = [
        r'eval\((.*?)\)',           # Eval function
        r'new\s+Function\((.*?)\)', # Function constructor
        r'setTimeout\((.*?)\)',     # SetTimeout
        r'setInterval\((.*?)\)',    # SetInterval
        r'XMLHttpRequest\(',        # XMLHttpRequest
        r'fetch\(',                 # Fetch
        r'window\.open\((.*?)\)'    # Dynamic window opening
    ]
    
    # Collect matches
    matches = []
    for pattern in patterns:
        matches.extend(re.findall(pattern, content, re.DOTALL))
    
    # ---- Mejorada la parte de detección de URLs ----
    
    # Expresión regular flexible para detectar dominios/URLs
    domain_pattern = re.compile(r'(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:/[^\s\'"<>]*)?')

    # Posibles URLs extraídas
    possible_cc_servers = re.findall(r'http[s]?://[^\s\'"<>]+', content, re.IGNORECASE)
    possible_cc_servers += domain_pattern.findall(content)
    
    # Decodificación básica de palabras para URLs ofuscadas
    for word in content.split():
        # Base64
        try:
            decoded = base64.b64decode(word).decode(errors='ignore')
            possible_cc_servers += domain_pattern.findall(decoded)
        except Exception:
            pass
        # URL decode
        decoded_url = urllib.parse.unquote(word)
        possible_cc_servers += domain_pattern.findall(decoded_url)
        # Reemplazo de "example[.]com"
        possible_cc_servers += domain_pattern.findall(word.replace('[.]', '.'))

    # Filtrado de URLs potencialmente maliciosas
    keywords = [
        'malicious', 'exploit', 'c2', 'attack', 'hacker', 'botnet', 'phish',
        'spam', 'trojan', 'virus', 'payload', '.ru', '.xyz', '.top', '.tk', '.cn', '.info'
    ]
    
    malicious_urls = [url for url in set(possible_cc_servers) if any(k in url.lower() for k in keywords)]
    
    return {
        "dynamic_code_matches": matches,
        "possible_cc_servers": malicious_urls
    }


# FUNCTION THAT GENERATES REPORT
def generate_report(filename):
    try:
        with open(filename, 'r') as file:
            content = file.read()  # Reads the entire content of the specified file

            # Execute all detection functions
            hex_data = find_hex_obfuscation(content)  # Finds hexadecimal obfuscation
            base64_data = find_base64_obfuscation(content)  # Finds Base64 obfuscation
            string_array_data = find_string_array_mapping(content)  # Detects string array mapping
            dead_code_data = find_dead_code(content)  # Detects dead code
            obfuscated_data = find_obfuscated_variables(content)  # Detects obfuscated variables
            control_flow_data = find_control_flow_obfuscation(content)  # Detects control flow obfuscation
            arithmetic_data = find_arithmetic_obfuscation(content)  # Detects arithmetic obfuscation
            minification_data = find_minification(content) # Detects minification
            dynamic_code_data = find_dynamic_code_generation(content) # Detects dynamic code generation




            report = ""

            # HEX analysis
            if hex_data["matches"]:
                report += f"· HEX encoding detected in file {filename}:\n"
                report += f" {hex_data['percentage']:.2f}% of the content is obfuscated using HEX encoding.\n"
            else:
                report += f"No HEX encoding detected in file {filename}.\n"

            # BASE64 analysis
            if base64_data["matches"]:
                report += f"\n· Base64 encoding detected in file {filename}:\n"
                report += f" {base64_data['percentage']:.2f}% of the content is obfuscated using Base64 encoding.\n"
            else:
                report += f"No Base64 encoding detected in file {filename}.\n"

            # String Array Mapping Analysis
            if string_array_data["count"] > 0:
                report += f"\n· String array mapping technique detected {string_array_data['count']} times:\n"
                for mapping in string_array_data["matches"]:
                    var_name, var_value = mapping
                    report += f"  - {var_name} = {var_value};\n"
            else:
                report += "· No string array mapping technique detected.\n"

            # Dead Code Detection Report
            if dead_code_data["count"] > 0:
                report += f"\n· Dead code detected:\n"
                if dead_code_data["unused_vars"]:
                    report += f"  Unused variables: {', '.join(dead_code_data['unused_vars'])}\n"
                if dead_code_data["unused_functions"]:
                    report += f"  Unused functions: {', '.join(dead_code_data['unused_functions'])}\n"
                if dead_code_data["unreachable_code_blocks"]:
                    report += f"  Unreachable code blocks ({len(dead_code_data['unreachable_code_blocks'])}):\n"
                    for block in dead_code_data["unreachable_code_blocks"]:
                        report += f"    {block}\n"
            else:
                report += f"No dead code detected in file {filename}.\n"

            # Obfuscated Variables Report
            if obfuscated_data["count"] > 0:
                report += f"\n· Obfuscated variable names detected {obfuscated_data['count']} times:\n"
                for var_name in obfuscated_data["matches"]:
                    report += f"  - {var_name}: {obfuscated_data['values'].get(var_name, 'No value found')}\n"
            else:
                report += f"No obfuscated variable names detected.\n"
            
            
            # Control Flow Obfuscation Report
            if control_flow_data["count"] > 0:
                report += f"· Control flow obfuscation detected {control_flow_data['count']} times:\n"
                for line_number in control_flow_data["matches"]:
                    report += f"  - Line {line_number}\n"
            else:
                report += f"No control flow obfuscation detected.\n"


             # Arithmetic Obfuscation Report
            if arithmetic_data["count"] > 0:
                report += f"· Arithmetic obfuscation detected {arithmetic_data['count']} times:\n"
                for expression in arithmetic_data["matches"]:
                    report += f"  - {expression}\n"
            else:
                report += f"No arithmetic obfuscation detected.\n"
            
            # Minification Report
            if minification_data["is_minified"]:
                report += f"· Minification detected:\n"
                report += f"  Original content length: {minification_data['original_length']} characters\n"
                report += f"  Minified content length: {minification_data['cleaned_length']} characters\n"
                report += f"  Whitespace reduction ratio: {minification_data['whitespace_ratio']:.2f}\n"
            else:
                report += f"No minification detected.\n"


            # Dynamic Code Generation Report
            if dynamic_code_data["dynamic_code_matches"]:
                report += f"· Dynamic code generation detected:\n"
                for code in dynamic_code_data["dynamic_code_matches"]:
                    report += f"  - {code}\n"
            else:
                report += f"No dynamic code generation detected.\n"

            # Possible C&C Servers
            # URLs detectadas
            if dynamic_code_data["decoded_url"]:
                report += "URLs detected:\n"
                for url in dynamic_code_data["decoded_url"]:
                    report += f"  - {url}\n"
            else:
                report += "No URLs detected.\n"

            # Possible C&C Servers (mismo bloque que antes)
            if dynamic_code_data["possible_cc_servers"]:
             report += "· Possible C&C server addresses detected:\n"
             for url in dynamic_code_data["possible_cc_servers"]:
                    report += f"  - {url}\n"
            else:
                report += "No possible C&C server addresses detected.\n"




            # Print report to stdout
            print(report)  # Prints the report to standard output (console)
            return report  # Returns the generated report
        
    except FileNotFoundError:
        error_message = f"File {filename} not found. Please verify filename and filepath.\n"
        print(error_message)  # Prints error message if the file is not found
        return error_message  # Returns error message
    


def gen_report_from_code(code_str):
    try:
    
        content = code_str  # Reads the content from the string 

        # Execute all detection functions
        hex_data = find_hex_obfuscation(content)  # Finds hexadecimal obfuscation
        base64_data = find_base64_obfuscation(content)  # Finds Base64 obfuscation
        string_array_data = find_string_array_mapping(content)  # Detects string array mapping
        dead_code_data = find_dead_code(content)  # Detects dead code
        obfuscated_data = find_obfuscated_variables(content)  # Detects obfuscated variables
        control_flow_data = find_control_flow_obfuscation(content)  # Detects control flow obfuscation
        arithmetic_data = find_arithmetic_obfuscation(content)  # Detects arithmetic obfuscation
        minification_data = find_minification(content) # Detects minification
        dynamic_code_data = find_dynamic_code_generation(content) # Detects dynamic code generation




        report = ""

        # HEX analysis
        if hex_data["matches"]:
            report += f"· HEX encoding detected in the code:\n"
            report += f" {hex_data['percentage']:.2f}% of the content is obfuscated using HEX encoding.\n"
        else:
            report += f"No HEX encoding detected in the code.\n"

        # BASE64 analysis
        if base64_data["matches"]:
            report += f"\n· Base64 encoding detected in the code:\n"
            report += f" {base64_data['percentage']:.2f}% of the content is obfuscated using Base64 encoding.\n"
        else:
            report += f"No Base64 encoding detected in the code.\n"

        # String Array Mapping Analysis
        if string_array_data["count"] > 0:
            report += f"\n· String array mapping technique detected {string_array_data['count']} times:\n"
            for mapping in string_array_data["matches"]:
                var_name, var_value = mapping
                report += f"  - {var_name} = {var_value};\n"
        else:
            report += "· No string array mapping technique detected.\n"

        # Dead Code Detection Report
        if dead_code_data["count"] > 0:
            report += f"\n· Dead code detected:\n"
            if dead_code_data["unused_vars"]:
                report += f"  Unused variables: {', '.join(dead_code_data['unused_vars'])}\n"
            if dead_code_data["unused_functions"]:
                report += f"  Unused functions: {', '.join(dead_code_data['unused_functions'])}\n"
            if dead_code_data["unreachable_code_blocks"]:
                report += f"  Unreachable code blocks ({len(dead_code_data['unreachable_code_blocks'])}):\n"
                for block in dead_code_data["unreachable_code_blocks"]:
                    report += f"    {block}\n"
        else:
            report += f"No dead code detected in the code.\n"

        # Obfuscated Variables Report
        if obfuscated_data["count"] > 0:
            report += f"\n· Obfuscated variable names detected {obfuscated_data['count']} times:\n"
            for var_name in obfuscated_data["matches"]:
                report += f"  - {var_name}: {obfuscated_data['values'].get(var_name, 'No value found')}\n"
        else:
            report += f"No obfuscated variable names detected.\n"
        
        
        # Control Flow Obfuscation Report
        if control_flow_data["count"] > 0:
            report += f"· Control flow obfuscation detected {control_flow_data['count']} times:\n"
            for line_number in control_flow_data["matches"]:
                report += f"  - Line {line_number}\n"
        else:
            report += f"No control flow obfuscation detected.\n"


            # Arithmetic Obfuscation Report
        if arithmetic_data["count"] > 0:
            report += f"· Arithmetic obfuscation detected {arithmetic_data['count']} times:\n"
            for expression in arithmetic_data["matches"]:
                report += f"  - {expression}\n"
        else:
            report += f"No arithmetic obfuscation detected.\n"
        
        # Minification Report
        if minification_data["is_minified"]:
            report += f"· Minification detected:\n"
            report += f"  Original content length: {minification_data['original_length']} characters\n"
            report += f"  Minified content length: {minification_data['cleaned_length']} characters\n"
            report += f"  Whitespace reduction ratio: {minification_data['whitespace_ratio']:.2f}\n"
        else:
            report += f"No minification detected.\n"


        # Dynamic Code Generation Report
        if dynamic_code_data["dynamic_code_matches"]:
            report += f"· Dynamic code generation detected:\n"
            for code in dynamic_code_data["dynamic_code_matches"]:
                report += f"  - {code}\n"
        else:
            report += f"No dynamic code generation detected.\n"

        # Possible C&C Servers
        if dynamic_code_data["possible_cc_servers"]:
            report += f"· Possible C&C server addresses detected:\n"
            for url in dynamic_code_data["possible_cc_servers"]:
                report += f"  - {url}\n"
        else:
            report += f"No possible C&C server addresses detected.\n"



        # Print report to stdout
        print(report)  # Prints the report to standard output (console)
        return report  # Returns the generated report
    
    except FileNotFoundError:
        error_message = f"Error generating report:\n"
        print(error_message)  # Prints error message if the file is not found
        return error_message  # Returns error message
        


# FUNCTION THAT DEOBFUSCATES CODE (HEX, BASE64, String Array Mapping, Arithmetic)

# Function to evaluate arithmetic expressions
def evaluate_expression(expression):
    try:
        # Evaluates the arithmetic expression safely
        return str(eval(expression))
    except Exception as e:
        print(f"Failed to evaluate expression: {expression}, Error: {e}")
        return expression

# Function to detect arithmetic obfuscation
def find_arithmetic_obfuscation(content):
    """
    Detects arithmetic obfuscation by finding patterns where numbers are hidden behind arithmetic expressions.
    """
    pattern = r'(\d+[\+\-\*/]\d+)'
    
    matches = re.findall(pattern, content)
    return {"count": len(matches), "matches": matches}

# Function to deobfuscate arithmetic expressions
def deobfuscate_arithmetic(content):
    pattern = r'(\d+[\+\-\*/]\d+)'
    
    def replace_with_value(match):
        expression = match.group(0)
        return evaluate_expression(expression)
    
    # Replace arithmetic expressions with their evaluated results
    return re.sub(pattern, replace_with_value, content)


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


              # Arithmetic Deobfuscation (simplified version)
            def evaluate_expression(expr):
                try:
                    # Evaluate arithmetic expression
                    return str(eval(expr))
                except:
                    return expr

            arithmetic_patterns = re.findall(r'\b\d+\s*[\+\-\*/]\s*\d+(\s*[\+\-\*/]\s*\d+)*\b', content)
            for pattern in arithmetic_patterns:
                result = evaluate_expression(pattern)
                content = content.replace(pattern, result)


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
        report_content = generate_report(args.report) # Generates report if -r/--report argument is specified
        # Print the output:
        print(report_content)
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

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
    # \xNN byte escapes
    hex_matches = re.findall(r'\\x[0-9a-fA-F]{2}', content)
    # \uNNNN and \u{NNNNN} Unicode escapes
    unicode_matches = re.findall(r'\\u(?:[0-9a-fA-F]{4}|\{[0-9a-fA-F]{1,6}\})', content)
    all_matches = hex_matches + unicode_matches

    match_length = sum(len(m) for m in all_matches)
    content_length = len(content)
    percentage = (match_length / content_length) * 100 if content_length > 0 else 0

    return {
        "matches": all_matches,
        "hex_matches": hex_matches,
        "unicode_matches": unicode_matches,
        "percentage": percentage,
        "total_length": content_length,
        "hex_length": match_length
    }

# FUNCTION THAT SEARCHES FOR BASE64 CODE

def find_base64_obfuscation(content):
    # Match properly padded base64 strings of at least 16 chars (reduces noise)
    candidates = re.findall(r'[A-Za-z0-9+/]{16,}={0,2}', content)

    valid = []
    for candidate in candidates:
        # Must be valid length
        if len(candidate) % 4 not in (0, 2, 3):
            continue
        # Must actually decode to printable text (not random bytes)
        try:
            padded = candidate + '=' * (-len(candidate) % 4)
            decoded = base64.b64decode(padded).decode('utf-8', errors='strict')
            if all(32 <= ord(c) < 127 or c in '\n\r\t' for c in decoded):
                valid.append(candidate)
        except Exception:
            continue

    base64_length = sum(len(m) for m in valid)
    content_length = len(content)
    percentage = (base64_length / content_length) * 100 if content_length > 0 else 0

    return {
        "matches": valid,
        "percentage": percentage,
        "total_length": content_length,
        "base64_length": base64_length
    }


# FUNCTION THAT SEARCHES FOR STRING ARRAY MAPPING
def find_string_array_mapping(content):
    # var/let/const declarations assigned to arrays or strings
    decl_pattern = r'(?:var|let|const)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*(\[.*?\]|\'.*?\'|\".*?\");'
    var_matches = re.findall(decl_pattern, content, re.DOTALL)

    # _0x#### style array names (obfuscator.io signature)
    hex_array_names = re.findall(r'\b(_0x[0-9a-fA-F]{3,6})\s*=\s*\[', content)

    # Array lookup accesses like _arr[0], _arr[1]
    array_accesses = re.findall(r'\b([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\[\s*\d+\s*\]', content)
    # Only count if the variable also appears as a declaration
    declared = {m[0] for m in var_matches} | set(hex_array_names)
    lookup_accesses = [a for a in array_accesses if a in declared]

    total_count = len(var_matches) + len(hex_array_names)

    return {
        "matches": var_matches,
        "hex_array_names": list(set(hex_array_names)),
        "lookup_accesses": list(set(lookup_accesses)),
        "count": total_count
    }

# FUNCTION THAT SEARCHES FOR DEAD CODE
def find_dead_code(content):
    # Unused variables: declared but appear only once (the declaration itself)
    declared_vars = re.findall(r'(?:var|let|const)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=', content)
    unused_vars = [
        v for v in declared_vars
        if len(re.findall(rf'\b{re.escape(v)}\b', content)) <= 1
    ]

    # Unused functions: defined but never called
    function_defs = re.findall(r'function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(', content)
    called = set(re.findall(r'\b([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(', content))
    unused_functions = [f for f in function_defs if f not in called]

    # Unreachable code: if(false), if(0), while(false), code after return
    unreachable_code_blocks = []
    unreachable_code_blocks += re.findall(r'if\s*\(\s*(?:false|0)\s*\)\s*\{[^}]*\}', content, re.DOTALL)
    unreachable_code_blocks += re.findall(r'while\s*\(\s*false\s*\)\s*\{[^}]*\}', content, re.DOTALL)
    # Statements after a bare return; inside a block
    unreachable_code_blocks += re.findall(r'return\s*;(?:\s*[^}\n][^\n]*\n)+', content)

    return {
        "unused_vars": list(set(unused_vars)),
        "unused_functions": list(set(unused_functions)),
        "unreachable_code_blocks": unreachable_code_blocks,
        "count": len(unused_vars) + len(unused_functions) + len(unreachable_code_blocks)
    }

# FUNCTION THAT DETECTS OBFUSCATED VARIABLE NAMES
def find_obfuscated_variables(content):
    obfuscated = []
    values = {}

    all_decls = re.findall(r'(?:var|let|const)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*([^;]{0,80})', content)

    vowels = set('aeiouAEIOU')
    common_short = {'i', 'j', 'k', 'n', 'x', 'y', 'z', 'e', 'el', 'fn', 'cb', 'id', 'fs', 'db', 'vm', 'ok'}

    for name, value in all_decls:
        flagged = False

        # _0x#### pattern — obfuscator.io and similar tools
        if re.match(r'^_0x[0-9a-fA-F]+$', name):
            flagged = True

        # Single/double letter names (excluding common legitimate ones)
        elif len(name) <= 2 and name not in common_short:
            flagged = True

        # Long names with no vowels — randomly generated identifiers
        elif len(name) >= 5 and not any(c in vowels for c in name):
            flagged = True

        # Names that look like random letter sequences (high consonant density, 6+ chars)
        elif len(name) >= 6:
            vowel_count = sum(1 for c in name.lower() if c in vowels)
            if vowel_count / len(name) < 0.1:
                flagged = True

        if flagged:
            obfuscated.append(name)
            values[name] = value.strip().strip('"\';')

    obfuscated = list(set(obfuscated))
    return {
        "matches": obfuscated,
        "values": values,
        "count": len(obfuscated)
    }


# Function to detect Control Flow Obfuscation (Spaghetti Code)
def find_control_flow_obfuscation(content):
    patterns = [
        r'if\s*\(.*\)\s*{[^}]*if\s*\(.*\)\s*{[^}]*}',           # Nested if statements
        r'for\s*\(.*\)\s*{[^}]*while\s*\(.*\)\s*{[^}]*}',        # Nested for+while
        r'function\s+.*\(\)\s*{[^}]*function\s+.*\(\)\s*{[^}]*}', # Nested functions
        r'\bcontinue\b[^;]*;[^}]*\bbreak\b[^;]*;',               # Unusual break/continue
        # Switch-based dispatcher: switch on array/variable with 4+ numeric cases
        r'switch\s*\([^)]+\)\s*\{(?:\s*case\s+\d+\s*:.*?){4,}',
        # Comma operator chains used to obscure sequential execution
        r'(?:[a-zA-Z_$][\w$]*\s*=\s*[^,;]+,\s*){3,}',
    ]

    matches = []
    line_numbers = set()

    for pattern in patterns:
        for match in re.finditer(pattern, content, re.DOTALL):
            line_number = content.count('\n', 0, match.start()) + 1
            line_numbers.add(line_number)
            matches.append(match.group())

    return {"count": len(matches), "matches": list(line_numbers)}

# FUNCTION TO DETECT STRING CONCATENATION OBFUSCATION

def find_string_concatenation(content):
    # Chains of 3 or more string literals joined by +
    pattern = r'(?:(?:"[^"]*"|\'[^\']*\')\s*\+\s*){2,}(?:"[^"]*"|\'[^\']*\')'
    matches = re.findall(pattern, content)
    return {
        "count": len(matches),
        "matches": matches
    }


# FUNCTION TO DETECT MINIFICATION OBFUSCATION

def find_minification(content):
    if not content.strip():
        return {"is_minified": False, "original_length": 0, "avg_line_length": 0, "whitespace_ratio": 0}

    lines = [l for l in content.splitlines() if l.strip()]
    avg_line_length = sum(len(l) for l in lines) / len(lines) if lines else 0

    non_whitespace = len(re.sub(r'\s', '', content))
    whitespace_ratio = 1 - (non_whitespace / len(content))

    # Minified: very long average lines AND very little whitespace relative to code
    is_minified = avg_line_length > 200 or (whitespace_ratio < 0.1 and len(content) > 200)

    return {
        "is_minified": is_minified,
        "original_length": len(content),
        "avg_line_length": round(avg_line_length, 1),
        "whitespace_ratio": round(whitespace_ratio, 3)
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

            hex_data = find_hex_obfuscation(content)
            base64_data = find_base64_obfuscation(content)
            string_array_data = find_string_array_mapping(content)
            dead_code_data = find_dead_code(content)
            obfuscated_data = find_obfuscated_variables(content)
            control_flow_data = find_control_flow_obfuscation(content)
            arithmetic_data = find_arithmetic_obfuscation(content)
            concat_data = find_string_concatenation(content)
            minification_data = find_minification(content)
            dynamic_code_data = find_dynamic_code_generation(content)

            report = ""

            if hex_data["matches"]:
                report += f"· HEX/Unicode encoding detected in file {filename}:\n"
                report += f"  {hex_data['percentage']:.2f}% of content uses \\x or \\u escapes"
                if hex_data["unicode_matches"]:
                    report += f" ({len(hex_data['unicode_matches'])} Unicode escape(s))"
                report += "\n"
            else:
                report += f"No HEX/Unicode encoding detected.\n"

            if base64_data["matches"]:
                report += f"\n· Base64 encoding detected ({len(base64_data['matches'])} string(s)):\n"
                report += f"  {base64_data['percentage']:.2f}% of content is Base64.\n"
            else:
                report += "No Base64 encoding detected.\n"

            if string_array_data["count"] > 0:
                report += f"\n· String array mapping detected {string_array_data['count']} time(s):\n"
                for name, value in string_array_data["matches"]:
                    report += f"  - {name} = {value[:60]};\n"
                if string_array_data["hex_array_names"]:
                    report += f"  Obfuscator-style arrays: {', '.join(string_array_data['hex_array_names'])}\n"
            else:
                report += "No string array mapping detected.\n"

            if concat_data["count"] > 0:
                report += f"\n· String concatenation obfuscation detected {concat_data['count']} chain(s).\n"
            else:
                report += "No string concatenation obfuscation detected.\n"

            if dead_code_data["count"] > 0:
                report += f"\n· Dead code detected:\n"
                if dead_code_data["unused_vars"]:
                    report += f"  Unused variables: {', '.join(dead_code_data['unused_vars'])}\n"
                if dead_code_data["unused_functions"]:
                    report += f"  Unused functions: {', '.join(dead_code_data['unused_functions'])}\n"
                if dead_code_data["unreachable_code_blocks"]:
                    report += f"  Unreachable code blocks: {len(dead_code_data['unreachable_code_blocks'])}\n"
            else:
                report += "No dead code detected.\n"

            if obfuscated_data["count"] > 0:
                report += f"\n· Obfuscated variable names detected ({obfuscated_data['count']}):\n"
                for name in obfuscated_data["matches"]:
                    report += f"  - {name}: {obfuscated_data['values'].get(name, '')[:60]}\n"
            else:
                report += "No obfuscated variable names detected.\n"

            if control_flow_data["count"] > 0:
                report += f"\n· Control flow obfuscation detected {control_flow_data['count']} time(s) at lines: {control_flow_data['matches']}\n"
            else:
                report += "No control flow obfuscation detected.\n"

            if arithmetic_data["count"] > 0:
                report += f"\n· Arithmetic obfuscation detected {arithmetic_data['count']} expression(s).\n"
            else:
                report += "No arithmetic obfuscation detected.\n"

            if minification_data["is_minified"]:
                report += f"\n· Minification detected:\n"
                report += f"  Avg line length: {minification_data['avg_line_length']} chars\n"
                report += f"  Whitespace ratio: {minification_data['whitespace_ratio']:.1%}\n"
            else:
                report += "No minification detected.\n"

            if dynamic_code_data["dynamic_code_matches"]:
                report += f"\n· Dynamic code generation detected ({len(dynamic_code_data['dynamic_code_matches'])} instance(s)).\n"
            else:
                report += "No dynamic code generation detected.\n"

            if dynamic_code_data["possible_cc_servers"]:
                report += f"\n· Possible C&C server addresses detected:\n"
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

        hex_data = find_hex_obfuscation(content)
        base64_data = find_base64_obfuscation(content)
        string_array_data = find_string_array_mapping(content)
        dead_code_data = find_dead_code(content)
        obfuscated_data = find_obfuscated_variables(content)
        control_flow_data = find_control_flow_obfuscation(content)
        arithmetic_data = find_arithmetic_obfuscation(content)
        concat_data = find_string_concatenation(content)
        minification_data = find_minification(content)
        dynamic_code_data = find_dynamic_code_generation(content)

        report = ""

        if hex_data["matches"]:
            report += f"· HEX/Unicode encoding detected:\n"
            report += f"  {hex_data['percentage']:.2f}% of content uses \\x or \\u escapes"
            if hex_data["unicode_matches"]:
                report += f" ({len(hex_data['unicode_matches'])} Unicode escape(s))"
            report += "\n"
        else:
            report += "No HEX/Unicode encoding detected.\n"

        if base64_data["matches"]:
            report += f"\n· Base64 encoding detected ({len(base64_data['matches'])} string(s)):\n"
            report += f"  {base64_data['percentage']:.2f}% of content is Base64.\n"
        else:
            report += "No Base64 encoding detected.\n"

        if string_array_data["count"] > 0:
            report += f"\n· String array mapping detected {string_array_data['count']} time(s):\n"
            for name, value in string_array_data["matches"]:
                report += f"  - {name} = {value[:60]};\n"
            if string_array_data["hex_array_names"]:
                report += f"  Obfuscator-style arrays: {', '.join(string_array_data['hex_array_names'])}\n"
        else:
            report += "No string array mapping detected.\n"

        if concat_data["count"] > 0:
            report += f"\n· String concatenation obfuscation detected {concat_data['count']} chain(s).\n"
        else:
            report += "No string concatenation obfuscation detected.\n"

        if dead_code_data["count"] > 0:
            report += f"\n· Dead code detected:\n"
            if dead_code_data["unused_vars"]:
                report += f"  Unused variables: {', '.join(dead_code_data['unused_vars'])}\n"
            if dead_code_data["unused_functions"]:
                report += f"  Unused functions: {', '.join(dead_code_data['unused_functions'])}\n"
            if dead_code_data["unreachable_code_blocks"]:
                report += f"  Unreachable code blocks: {len(dead_code_data['unreachable_code_blocks'])}\n"
        else:
            report += "No dead code detected.\n"

        if obfuscated_data["count"] > 0:
            report += f"\n· Obfuscated variable names detected ({obfuscated_data['count']}):\n"
            for name in obfuscated_data["matches"]:
                report += f"  - {name}: {obfuscated_data['values'].get(name, '')[:60]}\n"
        else:
            report += "No obfuscated variable names detected.\n"

        if control_flow_data["count"] > 0:
            report += f"\n· Control flow obfuscation detected {control_flow_data['count']} time(s) at lines: {control_flow_data['matches']}\n"
        else:
            report += "No control flow obfuscation detected.\n"

        if arithmetic_data["count"] > 0:
            report += f"\n· Arithmetic obfuscation detected {arithmetic_data['count']} expression(s).\n"
        else:
            report += "No arithmetic obfuscation detected.\n"

        if minification_data["is_minified"]:
            report += f"\n· Minification detected:\n"
            report += f"  Avg line length: {minification_data['avg_line_length']} chars\n"
            report += f"  Whitespace ratio: {minification_data['whitespace_ratio']:.1%}\n"
        else:
            report += "No minification detected.\n"

        if dynamic_code_data["dynamic_code_matches"]:
            report += f"\n· Dynamic code generation detected ({len(dynamic_code_data['dynamic_code_matches'])} instance(s)).\n"
        else:
            report += "No dynamic code generation detected.\n"

        if dynamic_code_data["possible_cc_servers"]:
            report += f"\n· Possible C&C server addresses detected:\n"
            for url in dynamic_code_data["possible_cc_servers"]:
                report += f"  - {url}\n"
        else:
            report += "No possible C&C server addresses detected.\n"



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


def deobfuscate_code(content):
    # \x hex escapes: \x41 -> 'A'
    def replace_hex(m):
        try:
            return chr(int(m.group(1), 16))
        except Exception:
            return m.group(0)
    content = re.sub(r'\\x([0-9a-fA-F]{2})', replace_hex, content)

    # \uNNNN Unicode escapes: \u0041 -> 'A'
    def replace_unicode(m):
        try:
            return chr(int(m.group(1), 16))
        except Exception:
            return m.group(0)
    content = re.sub(r'\\u([0-9a-fA-F]{4})', replace_unicode, content)

    # \u{NNNNN} extended Unicode escapes: \u{1F600} -> emoji
    def replace_unicode_ext(m):
        try:
            return chr(int(m.group(1), 16))
        except Exception:
            return m.group(0)
    content = re.sub(r'\\u\{([0-9a-fA-F]{1,6})\}', replace_unicode_ext, content)

    # Base64 deobfuscation
    base64_data = find_base64_obfuscation(content)
    for match in base64_data["matches"]:
        try:
            padded = match + '=' * (-len(match) % 4)
            decoded = base64.b64decode(padded).decode('utf-8')
            content = content.replace(match, decoded)
        except Exception:
            continue

    # String Array Mapping deobfuscation
    string_array_data = find_string_array_mapping(content)
    if string_array_data["matches"]:
        var_dict = {}
        for var_name, var_value in string_array_data["matches"]:
            if var_value.startswith("[") and var_value.endswith("]"):
                pairs = re.findall(r'"(.*?)"|\'(.*?)\'', var_value)
                var_dict[var_name] = [a or b for a, b in pairs]
            else:
                var_dict[var_name] = var_value.strip('\'"')
        for var_name, var_value in var_dict.items():
            if isinstance(var_value, list):
                for i, item in enumerate(var_value):
                    content = re.sub(rf'\b{re.escape(var_name)}\[{i}\]\b', item, content)
            else:
                content = re.sub(rf'\b{re.escape(var_name)}\b', var_value, content)

    # Arithmetic deobfuscation
    def eval_arith(m):
        try:
            return str(eval(m.group(0)))
        except Exception:
            return m.group(0)
    content = re.sub(r'\b\d+\s*[\+\-\*/]\s*\d+(\s*[\+\-\*/]\s*\d+)*\b', eval_arith, content)

    return content


def deobfuscate(filename):
    try:
        with open(filename, 'r') as file:
            return deobfuscate_code(file.read())
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

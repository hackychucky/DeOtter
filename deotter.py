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


# FUNCTION THAT GENERATES REPORT
def gen_report(filename):
    try:
        with open(filename, 'r') as file:
            content = file.read()  # Reads the entire content of the specified file

            # HEX analysis
            hex_data = find_hex_obfuscation(content)  # Executes find_hex_obfuscation function to find hexadecimals in the content
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

            # Print report to stdout
            print(report)  # Prints the report to standard output (console)
            return report  # Returns the generated report
    except FileNotFoundError:
        error_message = f"File {filename} not found. Please verify filename and filepath.\n"
        print(error_message)  # Prints error message if the file is not found
        return error_message  # Returns error message
    

# FUNCTION THAT DEOBFUSCATES CODE (HEX, BASE64,)
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

            return content  # Returns the deobfuscated content
    except FileNotFoundError:
        return f"File {filename} not found. Please, verify filename and filepath."


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

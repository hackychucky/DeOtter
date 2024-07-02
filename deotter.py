# DeOtter, the DeObfuscation tool for Cyber Security Analysts - Developed with ❤ from Spain by @HackyChucky
print ('Hello, this is DeOtter, the DeObfuscation tool for Cyber Security Analysts - Developed with ❤ from Spain by @HackyChucky')

# Imported Libraries
import argparse # Library for interacting with arguments through commands
import re       # Regular expressions library
import sys      # To check if the stdoutput is being passed to the report file


# FUNCTION THAT SEARCHES FOR HEXADECIMAL CODE

def find_hex(content):
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


# FUNCTION THAT GENERATES REPORT

def gen_report(filename):
    try:
        with open(filename, 'r') as file:
            content = file.read() # Reads the entire content of the specified file
            hex_data = find_hex(content) # Executes find_hex function to find hexadecimals in the content
            if hex_data["matches"]:
                report = f"·HEX encoding detected on file {filename}:\n"
                # Uncomment next line for showing HEX matches on report
                # report += "\n".join(hex_data["matches"]) + "\n"
                report += f" {hex_data['percentage']:.2f}% of the content of file {filename} is obfuscated using HEX encoding.\n"
            else:
                report = f"No HEX encoding detected on file {filename}.\n"
            # Print report to stdout
            print(report) # Prints the report to standard output (console)
            return report # Returns the generated report
    except FileNotFoundError:
        error_message = f"File {filename} not found. Please verify filename and filepath.\n"
        print(error_message) # Prints error message if the file is not found
        return error_message # Returns error message
    

# FUNCTION THAT DEOBFUSCATES HEXADECIMAL CODE
def deobfuscate(filename):
    try:
        with open(filename, 'r') as file:
            content = file.read() # Reads the entire content of the specified file
            hex_data = find_hex(content) # Executes find_hex function to find hexadecimals in the content
            if hex_data["matches"]:
                deobfuscated_content = content
                for match in hex_data["matches"]:
                    # Convert each hex match to a character
                    hex_value = match.replace("\\x", "") # Removes the \x prefix from the hexadecimal sequence
                    char = bytes.fromhex(hex_value).decode('utf-8') # Converts the hexadecimal sequence into a character
                    deobfuscated_content = deobfuscated_content.replace(match, char) # Replaces the hexadecimal sequence with the corresponding character
                return deobfuscated_content # Returns the deobfuscated content
            else:
                return f"No HEX encoding deobfuscation was detected{filename}."
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

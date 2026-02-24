import os
import sys
import subprocess
import json

# Constants derived from successful manual steps
PARENT_ID = "1cTDtmnBG2CQ3CIWaO5D7bC0PeaBbl50F"
TEMPLATE_ID = "17mAb-4u5j95vTLydxojtrwdgXe5KwHHU"
OUTPUT_DIR = os.path.join(os.getcwd(), "agreements")
TEMP_TEMPLATE_FILE = f"/tmp/AgreementMaker_Template_{os.getpid()}.md"

def run_command(command_string):
    """Executes a shell command string and returns stdout/stderr."""
    try:
        # Execute using shell=True to ensure proper parsing of quotes and pipes
        result = subprocess.run(command_string, capture_output=True, text=True, check=True, shell=True)
        return result.stdout, None
    except subprocess.CalledProcessError as e:
        return e.stdout, e.stderr
    except FileNotFoundError:
        return None, "Command not found."

def main():
    if len(sys.argv) != 4:
        print("Error: Missing required arguments.")
        print("Usage: python3 run.py \"Client Name\" \"Date YYYY-MM-DD\" \"Service Package\"")
        sys.exit(1)

    client_name = sys.argv[1]
    agreement_date = sys.argv[2]
    service_package = sys.argv[3]
    final_agreement_file = os.path.join(OUTPUT_DIR, f"{agreement_date}_Agreement_{client_name.replace(' ', '_')}.md")

    print(f"--- Starting Agreement Creation for {client_name} (Python Main Context) ---")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Download template
    print("1. Downloading template...")
    # FIX: Simplified command string format for shell=True execution
    cmd_download = f"gog drive download {TEMPLATE_ID} --out {TEMP_TEMPLATE_FILE}"
    stdout, stderr = run_command(cmd_download)
    if stderr:
        print(f"FAILURE: Step 1 Download failed. Error: {stderr}")
        sys.exit(1)
    print("SUCCESS: Template downloaded.")

    # 2. Copy to final path
    print(f"2. Copying to final path: {final_agreement_file}")
    cmd_copy = f"cp {TEMP_TEMPLATE_FILE} {final_agreement_file}"
    stdout, stderr = run_command(cmd_copy)
    if stderr:
        print(f"FAILURE: Step 2 Copy failed. Error: {stderr}")
        sys.exit(1)
    print("SUCCESS: File copied.")

    # 3. Edit file contents using raw file read/write (most robust method)
    print("3. Editing file contents...")
    try:
        with open(final_agreement_file, 'r') as f:
            content = f.read()
        
        content = content.replace('CLIENT NAME:', f'CLIENT NAME: {client_name}')
        content = content.replace('DATE:', f'DATE: {agreement_date}')
        content = content.replace('SERVICE PACKAGE:', f'SERVICE PACKAGE: {service_package}')
        
        with open(final_agreement_file, 'w') as f:
            f.write(content)
        
        print("SUCCESS: File edited.")
    except Exception as e:
        print(f"FAILURE: Step 3 Edit failed. Error: {e}")
        sys.exit(1)

    # 4. Upload
    print("4. Uploading file...")
    # FIX: Removed unnecessary external quotes around filename in command string
    cmd_upload = f"gog drive upload {final_agreement_file} --parent {PARENT_ID}"
    stdout, stderr = run_command(cmd_upload)
    if stderr:
        print(f"FAILURE: Step 4 Upload failed. Error: {stderr}")
        sys.exit(1)
    print("SUCCESS: Upload complete.")

    # 5. Sleep
    print("5. Sleeping for 5 seconds...")
    subprocess.run(["sleep", "5"])

    # 6. Verify
    print("6. Verifying upload...")
    # Corrected jq usage to avoid issues with shell parsing
    cmd_search = f"gog drive search \"name=\\\"{os.path.basename(final_agreement_file)}\\\"\" --max 1 --json | jq -r '.files[0].webViewLink'"
    stdout, stderr = run_command(cmd_search)
    
    if stderr:
        print(f"FAILURE: Step 6 Search failed. Error: {stderr}")
        sys.exit(1)

    verify_link = stdout.strip()
    if not verify_link or verify_link == "null":
        print(f"FAILURE: Step 6 Verification failed. Link not found or empty output: {stdout}")
        sys.exit(1)

    print(f"SUCCESS: Verification successful. URL: {verify_link}")

    # Cleanup
    print("7. Cleaning up temporary file.")
    os.remove(TEMP_TEMPLATE_FILE)
    print("--- Script Complete ---")

if __name__ == "__main__":
    main()
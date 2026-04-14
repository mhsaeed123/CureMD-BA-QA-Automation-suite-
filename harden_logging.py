import os
import re

# The target directory where the suite apps live
APPS_DIR = r"c:\Users\hassan.saeed\Documents\My Work\Repos\Initiatives\CureMD-BA-QA-Automation-suite-\apps"

# Matches the problematic logging block that was injected across files
LOGGING_BLOCK_REGEX = re.compile(
    r"# =============================================================================\s*"
    r"# (UNIVERSAL DETAILED LOGGING|DETAILED LOGGING MIDDLEWARE)\s*"
    r"# =============================================================================\s*"
    r".*?"
    r"# =============================================================================\s*",
    re.DOTALL
)

def fix_python_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = content
        
        # 1. Remove the universal logging block
        if LOGGING_BLOCK_REGEX.search(new_content):
            new_content = LOGGING_BLOCK_REGEX.sub("", new_content)

        # 2. Relocate from __future__ import annotations to the absolute top if it exists
        # This is a common cause of SyntaxError when something is injected above it.
        future_import_str = "from __future__ import annotations"
        if future_import_str in new_content:
            lines = new_content.split('\n')
            # Remove all occurrences of the future import
            lines = [line for line in lines if line.strip() != future_import_str]
            # Strip leading/trailing empty lines
            while lines and not lines[0].strip():
                lines.pop(0)
            # Re-insert at the top
            new_content = future_import_str + "\n\n" + "\n".join(lines)
            
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                f.write(new_content)
            print(f"Fixed: {filepath}")
            
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

def main():
    if not os.path.exists(APPS_DIR):
        print(f"Error: Directory {APPS_DIR} not found.")
        return

    print(f"Scanning for problematic logging injections in: {APPS_DIR}")
    count = 0
    for root, dirs, files in os.walk(APPS_DIR):
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                fix_python_file(filepath)
                count += 1
    
    print(f"Done. Processed {count} Python files.")

if __name__ == '__main__':
    main()

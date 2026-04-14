"""File Utilities - File Operations"""
import glob
import os
from pathlib import Path
from typing import List, Optional

def read_file(path: str, encoding: str = 'utf-8') -> str:
    """Read file contents."""
    with open(path, 'r', encoding=encoding) as f:
        return f.read()

def write_file(path: str, content: str, encoding: str = 'utf-8') -> str:
    """Write content to file."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding=encoding) as f:
        f.write(content)
    return f"Written to {path}"

def list_files(path: str = ".", pattern: str = "*", recursive: bool = True) -> List[str]:
    """List files matching pattern."""
    if recursive:
        return glob.glob(f"{path}/**/{pattern}", recursive=True)
    return glob.glob(f"{path}/{pattern}")

def search_files(pattern: str, path: str = ".") -> List[str]:
    """Search for text in files."""
    results = []
    for f in list_files(path, "*.py", recursive=True):
        try:
            with open(f, 'r', encoding='utf-8') as file:
                for i, line in enumerate(file, 1):
                    if pattern in line:
                        results.append(f"{f}:{i}: {line.strip()}")
        except:
            pass
    return results

def ensure_dir(path: str) -> None:
    """Ensure directory exists."""
    Path(path).mkdir(parents=True, exist_ok=True)

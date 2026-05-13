"""
Sandbox Runner
==============
Runs generated code in an isolated environment before registering.
"""

import asyncio
import logging
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict

logger = logging.getLogger(__name__)


class SandboxRunner:
    """Execute generated module code in isolation."""

    async def run(self, module_name: str, files: Dict[str, str]) -> dict:
        """
        Write files to a temp directory and run basic validation.

        Returns:
            {"success": bool, "path": str, "output": str, "error": str|None}
        """
        # Create sandbox directory
        sandbox_dir = Path(tempfile.mkdtemp(prefix=f"oneagent_sandbox_{module_name}_"))
        module_dir = sandbox_dir / module_name
        module_dir.mkdir(parents=True, exist_ok=True)

        # Write files
        for rel_path, content in files.items():
            file_path = sandbox_dir / rel_path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding="utf-8")

        # Basic syntax check
        for py_file in sandbox_dir.rglob("*.py"):
            try:
                compile(py_file.read_text(), str(py_file), "exec")
            except SyntaxError as e:
                return {
                    "success": False,
                    "path": str(sandbox_dir),
                    "output": "",
                    "error": f"Syntax error in {py_file.name}: {e}",
                }

        # Try importing the module
        result = await self._run_python(
            f"import sys; sys.path.insert(0, '{sandbox_dir}'); import {module_name}",
            cwd=str(sandbox_dir),
        )

        return {
            "success": result["returncode"] == 0,
            "path": str(sandbox_dir),
            "output": result["stdout"],
            "error": result["stderr"] if result["returncode"] != 0 else None,
        }

    @staticmethod
    async def _run_python(code: str, cwd: str = None) -> dict:
        """Run a Python snippet and capture output."""
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-c", code,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
        )
        stdout, stderr = await proc.communicate()
        return {
            "returncode": proc.returncode,
            "stdout": stdout.decode(),
            "stderr": stderr.decode(),
        }

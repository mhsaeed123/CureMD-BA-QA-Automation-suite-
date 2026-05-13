"""
Test Runner
===========
Auto-writes and runs pytest for self-authored modules.
"""

import asyncio
import logging
import sys
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class TestRunner:
    """Run tests for self-authored modules."""

    async def run(self, module_name: str, test_path: Optional[str] = None) -> dict:
        """
        Run pytest for a module.

        Returns:
            {"passed": bool, "output": str, "tests_run": int}
        """
        # Determine test path
        modules_dir = Path(__file__).resolve().parent.parent.parent / "modules"
        if test_path is None:
            # Look for tests in the module directory
            module_tests = modules_dir / module_name / "tests"
            if module_tests.exists():
                test_path = str(module_tests)
            else:
                # Look in top-level tests dir
                top_tests = modules_dir.parent / "tests" / f"test_{module_name}.py"
                if top_tests.exists():
                    test_path = str(top_tests)
                else:
                    return {
                        "passed": True,  # No tests = pass by default
                        "output": "No tests found",
                        "tests_run": 0,
                    }

        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "pytest", test_path, "-v", "--tb=short",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode()

        return {
            "passed": proc.returncode == 0,
            "output": output,
            "tests_run": output.count("PASSED") + output.count("FAILED"),
        }

    async def auto_write_tests(self, module_name: str, code: str) -> str:
        """
        Generate a basic test file for a module.
        Uses the LLM to write tests based on the code.
        """
        from llm_runtime.router import get_router
        router = get_router()

        response = await router.ask(
            prompt=f"""Write pytest tests for this OneAgent module:

Module name: {module_name}

Code:
```
{code}
```

Write comprehensive tests covering the tool functions. Import from the module directly.
Output ONLY the test file content, no markdown fences.""",
            task_class="code",
            use_cache=False,
        )
        return response.content

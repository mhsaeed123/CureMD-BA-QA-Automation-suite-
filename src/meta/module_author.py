"""
Module Author
=============
The meta-agent that writes new modules on demand.

When a recurring task can't be solved by composing existing skills/tools,
this agent drafts code, writes tests, and submits for review.
"""

import logging
from pathlib import Path
from typing import Optional

from ..llm.router import get_router
from .sandbox import SandboxRunner
from .test_runner import TestRunner
from .registry import MetaRegistry

logger = logging.getLogger(__name__)

MODULES_DIR = Path(__file__).resolve().parent.parent.parent / "modules"

CODEGEN_SYSTEM_PROMPT = """You are OneAgent's module author. You write Python modules for the OneAgent platform.

Rules:
1. Each module lives in modules/<name>/ with __init__.py and manifest.py
2. manifest.py must define: name, description, tools (list of function refs), routes (optional)
3. Tools are async functions decorated with @tool(name="...", description="...")
4. Import from core: from core.agents.tools import tool
5. Import LLM: from core.llm.router import get_router
6. Write clean, typed Python with docstrings
7. Include a tests/ folder with at least one test file

Output the complete module code. Use this format for each file:
--- FILE: <relative_path> ---
<file_content>
--- END FILE ---
"""


class ModuleAuthor:
    """Generates new OneAgent modules from task descriptions."""

    def __init__(self):
        self.router = get_router()
        self.sandbox = SandboxRunner()
        self.test_runner = TestRunner()
        self.registry = MetaRegistry()

    async def propose_module(
        self,
        task_description: str,
        module_name: Optional[str] = None,
    ) -> dict:
        """
        Propose a new module based on a task description.

        Returns:
            {"name": str, "files": dict, "provenance": dict}
        """
        prompt = f"""Create a OneAgent module for this task:
{task_description}

{"Module name: " + module_name if module_name else "Suggest an appropriate module name."}

Create all necessary files including __init__.py, manifest.py, tools.py, and tests.
"""
        response = await self.router.ask(
            prompt=prompt,
            system_prompt=CODEGEN_SYSTEM_PROMPT,
            task_class="code",
            use_cache=False,
        )

        # Parse the generated files
        files = self._parse_files(response.content)
        name = module_name or self._extract_name(response.content)

        provenance = {
            "prompt": task_description,
            "model": response.model,
            "provider": response.provider,
            "timestamp": response.usage,
            "status": "draft",
        }

        return {"name": name, "files": files, "provenance": provenance}

    async def propose_and_test(
        self,
        task_description: str,
        module_name: Optional[str] = None,
        auto_approve: bool = False,
    ) -> dict:
        """
        Propose, test, and optionally auto-approve a module.
        """
        proposal = await self.propose_module(task_description, module_name)
        name = proposal["name"]
        files = proposal["files"]

        # Write to sandbox
        sandbox_result = await self.sandbox.run(name, files)
        if not sandbox_result["success"]:
            proposal["provenance"]["status"] = "sandbox_failed"
            proposal["sandbox_result"] = sandbox_result
            return proposal

        # Run tests
        test_result = await self.test_runner.run(name)
        proposal["provenance"]["tests_passed"] = test_result["passed"]
        proposal["test_result"] = test_result

        if test_result["passed"]:
            proposal["provenance"]["status"] = "testing"
            self.registry.register(name, proposal["provenance"])
        else:
            proposal["provenance"]["status"] = "tests_failed"

        return proposal

    @staticmethod
    def _parse_files(content: str) -> dict:
        """Parse file blocks from LLM output."""
        files = {}
        parts = content.split("--- FILE: ")
        for part in parts[1:]:
            lines = part.split("\n", 1)
            if len(lines) < 2:
                continue
            path = lines[0].strip()
            body = lines[1]
            # Remove trailing --- END FILE ---
            end_marker = "--- END FILE ---"
            if end_marker in body:
                body = body[:body.index(end_marker)]
            files[path] = body.strip()
        return files

    @staticmethod
    def _extract_name(content: str) -> str:
        """Try to extract a module name from the generated code."""
        import re
        match = re.search(r"modules/(\w+)/", content)
        if match:
            return match.group(1)
        return "unnamed_module"

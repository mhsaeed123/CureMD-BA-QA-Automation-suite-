"""
Agent Loop
==========
Generic Plan → Tool-Call → Observe → Repeat loop.
One implementation reused by all modules.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from llm_runtime.router import LLMRouter, get_router
from tools.registry_v2 import ToolRegistry, ToolDefinition
from memory.buffer import ConversationBuffer
from memory.store import MemoryStore


class AgentMemory:
    """Combined short-term + long-term memory for the agent loop."""
    def __init__(self, max_buffer: int = 50):
        self.buffer = ConversationBuffer(max_messages=max_buffer)
        self.store = MemoryStore()

    def add_message(self, role: str, content: str):
        self.buffer.add(role, content)

    def get_context(self) -> List[Dict[str, str]]:
        return self.buffer.get_messages()


def get_registry():
    """Get the global tool registry."""
    return ToolRegistry

logger = logging.getLogger(__name__)

# System prompt template for the agent loop
AGENT_SYSTEM_PROMPT = """You are OneAgent, a helpful AI assistant with access to tools.

When you need to use a tool, respond with a JSON block:
```tool_call
{{"name": "<tool_name>", "arguments": {{<args>}}}}
```

You can use multiple tool calls. After receiving tool results, analyze them and respond to the user.
If you have enough information to answer directly, just respond normally (no tool call needed).
"""


class AgentLoop:
    """
    Generic agent loop: Plan → Tool-Call → Observe → Repeat.

    Usage:
        loop = AgentLoop(module="fhir")
        result = await loop.run("Find inconsistencies in FHIR Patient resources")
    """

    def __init__(
        self,
        module: str = "",
        *,
        max_iterations: int = 10,
        system_prompt: Optional[str] = None,
        memory: Optional[AgentMemory] = None,
        router: Optional[LLMRouter] = None,
        registry: Optional[ToolRegistry] = None,
        task_class: str = "reason",
        model: Optional[str] = None,
    ):
        self.module = module
        self.max_iterations = max_iterations
        self.system_prompt = system_prompt or AGENT_SYSTEM_PROMPT
        self.memory = memory or AgentMemory()
        self.router = router or get_router()
        self.registry = registry or get_registry()
        self.task_class = task_class
        self.model = model

    async def run(self, task: str, **kwargs) -> Dict[str, Any]:
        """
        Run the agent loop on a task.

        Returns:
            {"content": str, "tool_calls": int, "iterations": int, "cost": float}
        """
        self.memory.add_message("user", task)
        tool_calls_made = 0

        for iteration in range(self.max_iterations):
            # Build messages
            messages = []
            messages.append({"role": "system", "content": self.system_prompt})

            # Add tool descriptions to system prompt context
            tools = self._get_available_tools()
            if tools:
                tool_desc = "\n\nAvailable tools:\n"
                for t in tools:
                    tool_desc += f"- {t.name}: {t.description}\n"
                messages[0]["content"] += tool_desc

            messages.extend(self.memory.get_context())

            # Call LLM
            response = await self.router.ask(
                prompt="",
                messages=messages,
                task_class=self.task_class,
                module=self.module if self.module else None,
                model=self.model,
                use_cache=False,  # Don't cache agent loop turns
                **kwargs,
            )

            content = response.content
            self.memory.add_message("assistant", content)

            # Check for tool calls
            tool_calls = self._parse_tool_calls(content)
            if not tool_calls:
                # No more tool calls — agent is done
                return {
                    "content": content,
                    "tool_calls": tool_calls_made,
                    "iterations": iteration + 1,
                }

            # Execute tool calls
            for tc in tool_calls:
                tool_name = tc["name"]
                tool_args = tc.get("arguments", {})
                tool_calls_made += 1

                result = await self._execute_tool(tool_name, tool_args)
                result_str = json.dumps(result, default=str)
                self.memory.add_message(
                    "user",
                    f"[Tool Result: {tool_name}]\n{result_str[:2000]}",
                )

        # Max iterations reached
        return {
            "content": content,
            "tool_calls": tool_calls_made,
            "iterations": self.max_iterations,
            "warning": "Max iterations reached",
        }

    async def _execute_tool(self, name: str, args: Dict) -> Any:
        """Execute a tool by name."""
        tool_def = self.registry.get(name)
        if tool_def is None:
            return {"error": f"Tool '{name}' not found"}

        try:
            import asyncio
            if asyncio.iscoroutinefunction(tool_def.func):
                result = await tool_def.func(**args)
            else:
                result = tool_def.func(**args)
            return result
        except Exception as e:
            logger.exception(f"Tool '{name}' failed: {e}")
            return {"error": str(e)}

    def _get_available_tools(self) -> List[ToolDefinition]:
        """Get tools available to this agent."""
        all_tools = self.registry.get_all()
        if self.module:
            module_tools = self.registry.get_by_module(self.module)
            # Combine module-specific + global tools
            global_tools = [t for t in all_tools.values() if not t.module]
            return module_tools + global_tools
        return list(all_tools.values())

    @staticmethod
    def _parse_tool_calls(content: str) -> List[Dict]:
        """Extract tool_call JSON blocks from LLM output."""
        calls = []
        parts = content.split("```tool_call")
        for part in parts[1:]:
            # Find the closing ```
            end = part.find("```")
            if end == -1:
                continue
            json_str = part[:end].strip()
            try:
                call = json.loads(json_str)
                if "name" in call:
                    calls.append(call)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse tool call: {json_str[:100]}")
        return calls

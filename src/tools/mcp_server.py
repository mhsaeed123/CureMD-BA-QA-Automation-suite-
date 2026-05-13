"""
MCP Server
==========
Host side: registers tools from MCP servers and exposes them.
"""

import logging
from typing import Any, Callable, Dict, List

logger = logging.getLogger(__name__)


class MCPServerHost:
    """
    Host for MCP-compatible tool servers.
    Inspired by: OpenManus, Roo-Code.
    """

    def __init__(self):
        self.tools: Dict[str, Dict] = {}
        self._handlers: Dict[str, Callable] = {}

    def register_tool(
        self,
        name: str,
        description: str,
        parameters: Dict,
        handler: Callable,
    ):
        """Register a tool with its handler."""
        self.tools[name] = {
            "name": name,
            "description": description,
            "parameters": parameters,
        }
        self._handlers[name] = handler
        logger.info(f"MCP tool registered: {name}")

    def get_tool_schemas(self) -> List[Dict]:
        """Get OpenAI-compatible tool schemas."""
        schemas = []
        for name, tool in self.tools.items():
            schemas.append({
                "type": "function",
                "function": {
                    "name": name,
                    "description": tool["description"],
                    "parameters": {
                        "type": "object",
                        "properties": tool["parameters"].get("properties", {}),
                        "required": tool["parameters"].get("required", []),
                    },
                },
            })
        return schemas

    async def execute(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute a tool."""
        if tool_name not in self._handlers:
            raise ValueError(f"MCP tool not found: {tool_name}")
        handler = self._handlers[tool_name]
        import asyncio
        if asyncio.iscoroutinefunction(handler):
            return await handler(**arguments)
        return handler(**arguments)

    def list_tools(self) -> List[str]:
        return list(self.tools.keys())

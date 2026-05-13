"""
MCP Client
==========
Connects to external MCP servers and discovers their tools.
"""

import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class MCPClient:
    """Client for connecting to MCP servers."""

    def __init__(self):
        self._servers: Dict[str, dict] = {}
        self._tools: Dict[str, dict] = {}

    async def connect(self, name: str, url: str, *, headers: Optional[Dict] = None) -> bool:
        """Connect to an MCP server and discover its tools."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{url}/tools", headers=headers, timeout=10)
                resp.raise_for_status()
                tools_data = resp.json()

            self._servers[name] = {"url": url, "headers": headers}
            for tool in tools_data.get("tools", []):
                self._tools[tool["name"]] = {
                    "server": name,
                    "url": url,
                    "schema": tool,
                }
            logger.info(f"Connected to MCP server '{name}': {len(tools_data.get('tools', []))} tools")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to MCP server '{name}': {e}")
            return False

    async def call(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool on its MCP server."""
        if tool_name not in self._tools:
            raise ValueError(f"Tool not found: {tool_name}")
        tool_info = self._tools[tool_name]
        server = self._servers[tool_info["server"]]

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{server['url']}/tools/{tool_name}",
                json=arguments,
                headers=server.get("headers"),
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()

    def list_tools(self) -> List[str]:
        return list(self._tools.keys())

    def get_servers(self) -> Dict[str, dict]:
        return self._servers.copy()

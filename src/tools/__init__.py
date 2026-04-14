"""
Tools Module - MCP Integration and Utilities
==========================================
Inspired by: OpenManus MCP, Roo-Code, babyAGI functionz
Features:
- MCP (Model Context Protocol) integration
- Dynamic tool registration
- Magic proxy tools (any function becomes a tool)
"""

from .mcp import MCPServer, MCPTool, mcp_tool
from .registry import ToolRegistry, tool

__all__ = ["MCPServer", "MCPTool", "mcp_tool", "ToolRegistry", "tool"]

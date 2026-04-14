"""
MCP (Model Context Protocol) Integration
=====================================
Inspired by: OpenManus, Roo-Code
Features:
- Dynamic tool registration
- Schema-driven tools
- Tool execution with validation
"""

import asyncio
import inspect
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from functools import wraps

from ..logging import get_logger

logger = get_logger("tools.mcp")

@dataclass
class MCPTool:
    """MCP Tool definition."""
    name: str
    description: str
    parameters: Dict[str, Any]
    func: Callable = field(default=None)
    
    def to_openai_schema(self) -> Dict:
        """Convert to OpenAI function schema."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": self.parameters.get("properties", {}),
                    "required": self.parameters.get("required", [])
                }
            }
        }

def mcp_tool(name: str = None, description: str = "", parameters: Dict = None):
    """Decorator to register a function as an MCP tool."""
    def decorator(func: Callable) -> Callable:
        tool_name = name or func.__name__
        tool_desc = description or func.__doc__ or ""
        
        # Build parameters from function signature
        if parameters is None:
            sig = inspect.signature(func)
            properties = {}
            required = []
            for param_name, param in sig.parameters.items():
                if param_name in ('self', 'cls'):
                    continue
                param_type = "string"
                if param.annotation == int:
                    param_type = "integer"
                elif param.annotation == float:
                    param_type = "number"
                elif param.annotation == bool:
                    param_type = "boolean"
                elif param.annotation == list:
                    param_type = "array"
                elif param.annotation == dict:
                    param_type = "object"
                
                properties[param_name] = {"type": param_type}
                if param.default == inspect.Parameter.empty:
                    required.append(param_name)
            
            parameters = {
                "type": "object",
                "properties": properties,
                "required": required
            }
        
        # Attach tool metadata
        func._mcp_tool = MCPTool(
            name=tool_name,
            description=tool_desc,
            parameters=parameters,
            func=func
        )
        
        return func
    return decorator

class MCPServer:
    """
    MCP Server for tool execution.
    Inspired by: OpenManus, Roo-Code
    """
    
    def __init__(self):
        self.tools: Dict[str, MCPTool] = {}
        logger.info("MCP Server initialized")
    
    def register_tool(self, tool: MCPTool) -> None:
        """Register a tool."""
        self.tools[tool.name] = tool
        logger.debug(f"Registered tool: {tool.name}")
    
    def register_function(self, func: Callable, 
                         name: str = None,
                         description: str = "",
                         parameters: Dict = None) -> None:
        """Register a function as a tool."""
        tool = MCPTool(
            name=name or func.__name__,
            description=description or (func.__doc__ or ""),
            parameters=parameters or {},
            func=func
        )
        self.register_tool(tool)
    
    def get_tool_schemas(self) -> List[Dict]:
        """Get all tool schemas."""
        return [tool.to_openai_schema() for tool in self.tools.values()]
    
    async def execute_tool(self, tool_name: str, 
                          arguments: Dict[str, Any]) -> Any:
        """Execute a tool with arguments."""
        if tool_name not in self.tools:
            raise ValueError(f"Tool '{tool_name}' not found")
        
        tool = self.tools[tool_name]
        
        logger.debug(f"Executing tool: {tool_name} with args: {arguments}")
        
        try:
            if asyncio.iscoroutinefunction(tool.func):
                result = await tool.func(**arguments)
            else:
                result = tool.func(**arguments)
            
            logger.debug(f"Tool {tool_name} result: {str(result)[:100]}")
            return result
            
        except Exception as e:
            logger.exception(f"Tool {tool_name} failed: {e}")
            raise
    
    def discover_tools(self, obj: Any) -> None:
        """Discover tools from an object (class or module)."""
        for name in dir(obj):
            if name.startswith('_'):
                continue
            
            attr = getattr(obj, name)
            if callable(attr) and hasattr(attr, '_mcp_tool'):
                tool = attr._mcp_tool
                self.register_tool(tool)

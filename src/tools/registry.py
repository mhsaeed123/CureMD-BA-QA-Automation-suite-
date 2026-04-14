"""Tool Registry - Decorator-based Tool Registration"""
from functools import wraps
from typing import Callable, Dict, Any

class ToolRegistry:
    """Simple tool registry with decorator support."""
    
    _tools: Dict[str, Callable] = {}
    
    @classmethod
    def register(cls, name: str = None):
        """Decorator to register a function as a tool."""
        def decorator(func: Callable) -> Callable:
            tool_name = name or func.__name__
            cls._tools[tool_name] = func
            
            @wraps(func)
            def wrapper(*args, **kwargs):
                return func(*args, **kwargs)
            
            wrapper._is_tool = True
            wrapper._tool_name = tool_name
            return wrapper
        return decorator
    
    @classmethod
    def get_tool(cls, name: str) -> Callable:
        """Get a registered tool."""
        return cls._tools.get(name)
    
    @classmethod
    def get_all_tools(cls) -> Dict[str, Callable]:
        """Get all registered tools."""
        return cls._tools.copy()

def tool(name: str = None, description: str = ""):
    """Shorthand decorator for ToolRegistry.register."""
    return ToolRegistry.register(name)

"""
Tool Registry
=============
Decorator-based tool registration. Modules contribute tools;
the agent loop discovers and calls them.
"""

from dataclasses import dataclass, field
from functools import wraps
from inspect import signature, Parameter
from typing import Any, Callable, Dict, List, Optional


@dataclass
class ToolDefinition:
    """Metadata for a registered tool."""

    name: str
    description: str
    func: Callable
    parameters: Dict[str, Any] = field(default_factory=dict)
    module: str = ""

    def to_openai_schema(self) -> Dict:
        """Convert to OpenAI function-calling schema."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": self.parameters.get("properties", {}),
                    "required": self.parameters.get("required", []),
                },
            },
        }


class ToolRegistry:
    """
    Global registry for tools. Modules register tools at import time;
    the agent loop queries the registry at runtime.
    """

    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register(
        self,
        name: Optional[str] = None,
        description: str = "",
        module: str = "",
    ):
        """
        Decorator to register a function as a tool.

        Usage:
            registry = ToolRegistry()

            @registry.register(name="search_fhir", description="Search FHIR resources")
            async def search_fhir(query: str, resource_type: str = "Patient") -> dict:
                ...
        """

        def decorator(func: Callable) -> Callable:
            tool_name = name or func.__name__
            tool_desc = description or func.__doc__ or ""

            # Build parameter schema from signature
            params = self._build_params(func)

            tool_def = ToolDefinition(
                name=tool_name,
                description=tool_desc,
                func=func,
                parameters=params,
                module=module,
            )
            self._tools[tool_name] = tool_def

            # Attach metadata to function
            func._tool_definition = tool_def
            func._is_tool = True

            @wraps(func)
            def wrapper(*args, **kwargs):
                return func(*args, **kwargs)

            wrapper._tool_definition = tool_def
            wrapper._is_tool = True
            return wrapper

        return decorator

    def get(self, name: str) -> Optional[ToolDefinition]:
        """Get a tool by name."""
        return self._tools.get(name)

    def get_all(self) -> Dict[str, ToolDefinition]:
        """Return all registered tools."""
        return self._tools.copy()

    def get_by_module(self, module: str) -> List[ToolDefinition]:
        """Return all tools for a specific module."""
        return [t for t in self._tools.values() if t.module == module]

    def get_schemas(self, module: Optional[str] = None) -> List[Dict]:
        """Get OpenAI-compatible tool schemas."""
        if module:
            tools = self.get_by_module(module)
        else:
            tools = list(self._tools.values())
        return [t.to_openai_schema() for t in tools]

    def clear(self):
        """Remove all tools."""
        self._tools.clear()

    @staticmethod
    def _build_params(func: Callable) -> Dict:
        """Build parameter schema from function signature."""
        type_map = {
            str: "string",
            int: "integer",
            float: "number",
            bool: "boolean",
            list: "array",
            dict: "object",
        }
        properties = {}
        required = []
        sig = signature(func)
        for param_name, param in sig.parameters.items():
            if param_name in ("self", "cls"):
                continue
            param_type = "string"
            if param.annotation != Parameter.empty:
                param_type = type_map.get(param.annotation, "string")
            properties[param_name] = {"type": param_type}
            if param.default == Parameter.empty:
                required.append(param_name)
        return {"type": "object", "properties": properties, "required": required}


# ---------------------------------------------------------------------------
# Global registry singleton
# ---------------------------------------------------------------------------

_global_registry: Optional[ToolRegistry] = None


def get_registry() -> ToolRegistry:
    """Get the global tool registry."""
    global _global_registry
    if _global_registry is None:
        _global_registry = ToolRegistry()
    return _global_registry


def tool(
    name: Optional[str] = None,
    description: str = "",
    module: str = "",
):
    """Shorthand decorator: registers with the global registry."""
    return get_registry().register(name=name, description=description, module=module)

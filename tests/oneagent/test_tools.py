"""Tests for core.agents.tools — tool registration with global registry."""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest

from core.agents.tools import ToolRegistry


class TestToolRegistryAdvanced:
    """Advanced tests for parameter schema generation."""

    def test_string_param(self):
        reg = ToolRegistry()

        @reg.register(name="t1")
        async def func(name: str): pass

        tool = reg.get("t1")
        assert tool.parameters["properties"]["name"]["type"] == "string"

    def test_int_param(self):
        reg = ToolRegistry()

        @reg.register(name="t2")
        async def func(count: int): pass

        tool = reg.get("t2")
        assert tool.parameters["properties"]["count"]["type"] == "integer"

    def test_optional_not_required(self):
        reg = ToolRegistry()

        @reg.register(name="t3")
        async def func(required: str, optional: str = "default"): pass

        tool = reg.get("t3")
        assert "required" in tool.parameters["required"]
        assert "optional" not in tool.parameters["required"]

    def test_clear(self):
        reg = ToolRegistry()

        @reg.register(name="temp")
        async def func(): pass

        assert len(reg.get_all()) == 1
        reg.clear()
        assert len(reg.get_all()) == 0

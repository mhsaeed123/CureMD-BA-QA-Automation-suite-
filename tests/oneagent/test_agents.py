"""Tests for core.agents module."""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest

from core.agents.loop import AgentLoop
from core.agents.tools import ToolRegistry, get_registry
from core.agents.memory import AgentMemory, ConversationBuffer, KeyValueStore


class TestToolRegistry:
    """Tests for the tool registry."""

    def setup_method(self):
        self.registry = ToolRegistry()

    def test_register_function(self):
        @self.registry.register(name="test_tool", description="A test tool", module="test")
        async def test_func(query: str) -> dict:
            return {"result": query}

        assert self.registry.get("test_tool") is not None

    def test_tool_has_schema(self):
        @self.registry.register(name="schema_test", description="Schema test")
        async def schema_func(query: str, count: int = 5) -> dict:
            return {}

        tool = self.registry.get("schema_test")
        schema = tool.to_openai_schema()
        assert schema["type"] == "function"
        assert schema["function"]["name"] == "schema_test"

    def test_get_by_module(self):
        @self.registry.register(name="mod_a", module="alpha")
        async def func_a(): pass

        @self.registry.register(name="mod_b", module="beta")
        async def func_b(): pass

        alpha_tools = self.registry.get_by_module("alpha")
        assert len(alpha_tools) == 1
        assert alpha_tools[0].name == "mod_a"

    def test_get_schemas(self):
        @self.registry.register(name="s1", description="Tool 1")
        async def f1(): pass

        @self.registry.register(name="s2", description="Tool 2")
        async def f2(): pass

        schemas = self.registry.get_schemas()
        assert len(schemas) == 2


class TestConversationBuffer:
    def test_add_and_get(self):
        buf = ConversationBuffer(max_messages=10)
        buf.add("user", "Hello")
        buf.add("assistant", "Hi there!")
        assert len(buf) == 2

    def test_sliding_window(self):
        buf = ConversationBuffer(max_messages=3)
        for i in range(5):
            buf.add("user", f"Message {i}")
        assert len(buf) == 3

    def test_to_llm_format(self):
        buf = ConversationBuffer()
        buf.add("user", "Hello")
        buf.add("assistant", "Hi")
        msgs = buf.to_llm_format()
        assert len(msgs) == 2
        assert msgs[0] == {"role": "user", "content": "Hello"}


class TestAgentMemory:
    def test_remember_recall(self, tmp_path):
        mem = AgentMemory(store_path=tmp_path / "test_memory.json")
        mem.remember("key1", "value1")
        assert mem.recall("key1") == "value1"

    def test_conversation_context(self):
        mem = AgentMemory()
        mem.add_message("user", "Hello")
        context = mem.get_context()
        assert len(context) == 1


class TestAgentLoop:
    def test_parse_tool_calls(self):
        content = 'I need to search. ```tool_call\n{"name": "search", "arguments": {"query": "FHIR"}}\n```'
        calls = AgentLoop._parse_tool_calls(content)
        assert len(calls) == 1
        assert calls[0]["name"] == "search"

    def test_parse_no_tool_calls(self):
        content = "Just a regular response, no tools needed."
        calls = AgentLoop._parse_tool_calls(content)
        assert len(calls) == 0

    def test_parse_multiple_tool_calls(self):
        content = (
            '```tool_call\n{"name": "search", "arguments": {"q": "a"}}\n```\n'
            '```tool_call\n{"name": "analyze", "arguments": {"data": "b"}}\n```'
        )
        calls = AgentLoop._parse_tool_calls(content)
        assert len(calls) == 2

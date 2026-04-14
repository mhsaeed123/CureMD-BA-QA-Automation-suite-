"""
Unit Tests for Agents Module
=============================
"""

import pytest
import asyncio
from src.agents import Agent, AgentConfig, CoderAgent, SupervisorAgent
from src.agents.base import ToolResult

@pytest.fixture
def agent_config():
    return AgentConfig(name="test_agent", max_iterations=5)

@pytest.fixture
def coder_agent():
    config = AgentConfig(name="test_coder", max_iterations=5)
    return CoderAgent(config)

class TestAgent:
    """Test base Agent class."""
    
    def test_agent_initialization(self, agent_config):
        agent = Agent(agent_config)
        assert agent.id is not None
        assert agent.state.value == "idle"
        assert agent.config.name == "test_agent"
    
    def test_register_tool(self, agent_config):
        agent = Agent(agent_config)
        
        def mock_tool(x: int) -> int:
            return x * 2
        
        agent.register_tool("double", mock_tool, {
            "description": "Double a number",
            "parameters": {
                "type": "object",
                "properties": {"x": {"type": "integer"}},
                "required": ["x"]
            }
        })
        
        assert "double" in agent._tools
        assert "double" in agent._tool_schemas
    
    @pytest.mark.asyncio
    async def test_execute_tool_success(self, agent_config):
        agent = Agent(agent_config)
        
        def mock_tool(x: int) -> int:
            return x * 2
        
        agent.register_tool("double", mock_tool, {
            "description": "Double a number",
            "parameters": {"type": "object", "properties": {"x": {"type": "integer"}}}
        })
        
        result = await agent.execute_tool("double", {"x": 5})
        
        assert result.success is True
        assert result.result == 10
    
    @pytest.mark.asyncio
    async def test_execute_tool_failure(self, agent_config):
        agent = Agent(agent_config)
        
        def failing_tool():
            raise ValueError("Tool failed")
        
        agent.register_tool("fail", failing_tool, {
            "description": "Failing tool",
            "parameters": {"type": "object"}
        })
        
        result = await agent.execute_tool("fail", {})
        
        assert result.success is False
        assert "Tool failed" in result.error

class TestCoderAgent:
    """Test CoderAgent class."""
    
    def test_coder_initialization(self, coder_agent):
        assert coder_agent.config.name == "test_coder"
        assert "read_file" in coder_agent._tools
        assert "write_file" in coder_agent._tools
    
    def test_bracket_balance(self, coder_agent):
        # Balanced brackets
        assert coder_agent._check_bracket_balance("()[]{}") is True
        assert coder_agent._check_bracket_balance("function({a: 1})") is True
        
        # Unbalanced brackets
        assert coder_agent._check_bracket_balance("([)]") is False
        assert coder_agent._check_bracket_balance("(") is False

class TestSupervisorAgent:
    """Test SupervisorAgent class."""
    
    def test_supervisor_initialization(self):
        config = AgentConfig(name="test_supervisor")
        supervisor = SupervisorAgent(config)
        
        assert "delegate_to_coder" in supervisor._tool_schemas
        assert "delegate_to_browser" in supervisor._tool_schemas
        assert "delegate_to_researcher" in supervisor._tool_schemas
    
    def test_register_worker(self):
        config = AgentConfig(name="test_supervisor")
        supervisor = SupervisorAgent(config)
        
        coder_config = AgentConfig(name="worker_coder")
        coder = Agent(coder_config)
        
        supervisor.register_worker("worker_coder", coder)
        
        assert "worker_coder" in supervisor.agents
        assert "delegate_to_worker_coder" in supervisor._tool_schemas

"""
Supervisor Agent - Multi-Agent Orchestration
============================================
Inspired by: MetaGPT, LangGraph Supervisor Pattern, OpenManus
Features:
- Task decomposition and delegation
- Fan-out/fan-in execution
- Agent spawning and management
- State coordination
"""

import asyncio
from typing import Any, Dict, List, Optional, Type
from .base import Agent, AgentConfig, AgentState

class SupervisorAgent(Agent):
    """
    Supervisor agent that coordinates multiple sub-agents.
    Inspired by LangGraph supervisor pattern and MetaGPT roles.
    """
    
    def __init__(self, config: AgentConfig):
        super().__init__(config)
        self.agents: Dict[str, Agent] = {}
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.results: Dict[str, Any] = {}
    
    def register_worker(self, name: str, agent: Agent) -> None:
        """Register a worker agent."""
        self.agents[name] = agent
        self.register_tool(f"delegate_to_{name}", self._create_delegate(name), {
            "description": f"Delegate task to {name} agent",
            "parameters": {"type": "object", "properties": {
                "task": {"type": "string"}
            }, "required": ["task"]}
        })
    
    def _create_delegate(self, agent_name: str):
        async def delegate(task: str) -> str:
            if agent_name not in self.agents:
                return f"Agent {agent_name} not found"
            agent = self.agents[agent_name]
            result = await agent.run(task)
            self.results[agent_name] = result
            return str(result)
        return delegate
    
    async def think(self) -> str:
        """Analyze task and decide which agent to delegate."""
        if not self.messages:
            return "No task defined"
        
        last_msg = self.messages[-1].content
        
        # Simple routing logic - in production, use LLM
        if "code" in last_msg.lower() or "file" in last_msg.lower():
            return "delegate_to_coder"
        elif "browse" in last_msg.lower() or "web" in last_msg.lower():
            return "delegate_to_browser"
        elif "research" in last_msg.lower() or "search" in last_msg.lower():
            return "delegate_to_researcher"
        
        return "delegate_to_coder"  # Default
    
    async def act(self) -> Any:
        """Execute delegation."""
        thought = await self.think()
        
        if thought.startswith("delegate_to_"):
            agent_name = thought.replace("delegate_to_", "")
            task = self.messages[-1].content
            
            if agent_name in self.agents:
                result = await self.agents[agent_name].run(task)
                self.results[agent_name] = result
                return result
        
        return {"status": "completed", "message": "Task processed by supervisor"}
    
    def _is_done(self, result: Any) -> bool:
        """Check if all tasks are complete."""
        return isinstance(result, dict) and result.get("status") == "completed"

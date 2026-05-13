"""
Base Agent Class
================
Provides common functionality for all agents in the QA automation suite.

Author: CureMD BA QA Team
Version: 1.0.0
"""

import asyncio
import logging
from enum import Enum
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
from abc import ABC, abstractmethod


class AgentStatus(Enum):
    """Agent execution status."""
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING = "waiting"


@dataclass
class AgentContext:
    """Context for agent execution."""
    task_id: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    history: List[Dict] = field(default_factory=list)


class BaseAgent(ABC):
    """
    Base class for all agents in the QA automation suite.
    
    Provides common functionality including:
    - Logging and error handling
    - State management
    - Tool execution
    - Event callbacks
    """
    
    def __init__(
        self,
        name: str,
        description: str = "",
        max_retries: int = 3,
        timeout: int = 300
    ):
        """
        Initialize the base agent.
        
        Args:
            name: Agent name
            description: Agent description
            max_retries: Maximum number of retries on failure
            timeout: Timeout in seconds for operations
        """
        self.name = name
        self.description = description or name
        self.max_retries = max_retries
        self.timeout = timeout
        
        # Setup logging
        self.logger = logging.getLogger(f"agents.{name}")
        
        # State management
        self.status = AgentStatus.IDLE
        self.context: Optional[AgentContext] = None
        self.tools: Dict[str, Callable] = {}
        self._history: List[Dict] = []
        
        # Initialize agent
        self._initialize()
    
    def _initialize(self):
        """Initialize agent-specific components. Override in subclasses."""
        pass
    
    def register_tool(self, name: str, func: Callable):
        """Register a tool for the agent to use."""
        self.tools[name] = func
        self.logger.debug(f"Registered tool: {name}")
    
    async def execute_tool(self, name: str, **kwargs) -> Any:
        """Execute a registered tool."""
        if name not in self.tools:
            raise ValueError(f"Tool '{name}' not found. Available: {list(self.tools.keys())}")
        
        tool = self.tools[name]
        try:
            if asyncio.iscoroutinefunction(tool):
                return await tool(**kwargs)
            return tool(**kwargs)
        except Exception as e:
            self.logger.error(f"Tool '{name}' failed: {e}")
            raise
    
    async def think(self, prompt: str) -> str:
        """
        Think/reason about a prompt.
        Override in subclasses for specific reasoning logic.
        """
        self.logger.info(f"[{self.name}] Thinking: {prompt[:100]}...")
        return f"Reasoning about: {prompt}"
    
    async def plan(self, task: str) -> List[Dict[str, Any]]:
        """
        Plan steps to accomplish a task.
        Returns a list of action dictionaries.
        """
        return [
            {"action": "execute", "task": task}
        ]
    
    @abstractmethod
    async def act(self, action: str, context: Optional[Dict] = None) -> Any:
        """
        Perform an action based on the current thought.
        Must be implemented by subclasses.
        """
        pass
    
    async def run(self, task: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Main execution loop for the agent.
        
        Args:
            task: The task to execute
            context: Additional context for execution
            
        Returns:
            Result dictionary with status, output, and metadata
        """
        self.logger.info(f"[{self.name}] Starting task: {task}")
        self.status = AgentStatus.RUNNING
        
        start_time = datetime.now()
        result = {
            "agent": self.name,
            "task": task,
            "status": "running",
            "start_time": start_time.isoformat(),
            "steps": [],
            "errors": []
        }
        
        try:
            # Think
            thought = await self.think(task)
            result["thought"] = thought
            
            # Plan
            plan = await self.plan(task)
            result["plan"] = plan
            
            # Act
            for step in plan:
                step_start = datetime.now()
                try:
                    action = step.get("action", "execute")
                    output = await self.act(action, context or {})
                    
                    result["steps"].append({
                        "action": action,
                        "output": output,
                        "duration_ms": (datetime.now() - step_start).total_seconds() * 1000
                    })
                except Exception as e:
                    self.logger.error(f"Step failed: {e}")
                    result["errors"].append({"action": step.get("action"), "error": str(e)})
            
            result["status"] = "completed" if not result["errors"] else "partial"
            self.status = AgentStatus.COMPLETED
            
        except Exception as e:
            self.logger.error(f"Agent failed: {e}")
            result["status"] = "failed"
            result["error"] = str(e)
            self.status = AgentStatus.FAILED
            
            # Retry logic
            for attempt in range(self.max_retries):
                self.logger.info(f"Retry attempt {attempt + 1}/{self.max_retries}")
                try:
                    # Reset and retry
                    self.status = AgentStatus.RUNNING
                    result["status"] = "running"
                    result["retry_attempt"] = attempt + 1
                    # Simplified retry - just re-run
                    thought = await self.think(task)
                    output = await self.act("retry", context)
                    result["status"] = "completed"
                    self.status = AgentStatus.COMPLETED
                    break
                except Exception as retry_error:
                    self.logger.error(f"Retry {attempt + 1} failed: {retry_error}")
                    if attempt == self.max_retries - 1:
                        result["status"] = "failed"
                        self.status = AgentStatus.FAILED
        
        result["end_time"] = datetime.now().isoformat()
        result["duration_ms"] = (datetime.now() - start_time).total_seconds() * 1000
        result["history"] = self._history
        
        self._history.append(result)
        return result
    
    def get_history(self) -> List[Dict]:
        """Get execution history."""
        return self._history
    
    def clear_history(self):
        """Clear execution history."""
        self._history.clear()
    
    def get_status(self) -> Dict[str, Any]:
        """Get agent status information."""
        return {
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "tools_count": len(self.tools),
            "history_count": len(self._history)
        }
    
    def reset(self):
        """Reset agent to initial state."""
        self.status = AgentStatus.IDLE
        self.context = None
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(name='{self.name}', status={self.status.value})>"


class AgentFactory:
    """Factory for creating agents."""
    
    _agents: Dict[str, type] = {}
    
    @classmethod
    def register(cls, name: str, agent_class: type):
        """Register an agent class."""
        cls._agents[name] = agent_class
    
    @classmethod
    def create(cls, name: str, **kwargs) -> BaseAgent:
        """Create an agent by name."""
        if name not in cls._agents:
            raise ValueError(f"Unknown agent: {name}. Available: {list(cls._agents.keys())}")
        return cls._agents[name](**kwargs)
    
    @classmethod
    def list_agents(cls) -> List[str]:
        """List registered agent types."""
        return list(cls._agents.keys())


# Register default agents
from .qa_agent import QAAgent
from .automation_agent import AutomationAgent

AgentFactory.register("qa", QAAgent)
AgentFactory.register("automation", AutomationAgent)
AgentFactory.register("base", BaseAgent)
"""
Base Agent - Core Agent Class
==============================
Inspired by: OpenManus, AutoGPT, MetaGPT, OpenHands, Roo-Code
Features:
- ReAct pattern (Reasoning + Acting)
- Tool execution with schema validation
- State management with checkpoints
- Event streaming for observability
- Recursive sub-agent spawning
"""

import asyncio
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Type

from ..logging import get_logger, TaskLogger, trace

logger = get_logger("agents.base")

# ============================================================================
# ENUMS & DATA CLASSES
# ============================================================================

class AgentState(Enum):
    """Agent execution states."""
    IDLE = "idle"
    THINKING = "thinking"
    ACTING = "acting"
    WAITING = "waiting"
    DONE = "done"
    ERROR = "error"

@dataclass
class AgentConfig:
    """Configuration for agent behavior."""
    name: str = "agent"
    model: str = "gpt-4"
    provider: str = "openai"
    max_iterations: int = 100
    max_retries: int = 3
    timeout: int = 300
    temperature: float = 0.7
    system_prompt: Optional[str] = None
    tools: List[str] = field(default_factory=list)
    memory_enabled: bool = True
    checkpoint_enabled: bool = True

@dataclass
class ToolResult:
    """Result from tool execution."""
    tool: str
    args: Dict[str, Any]
    success: bool
    result: Any = None
    error: Optional[str] = None
    duration_ms: float = 0

@dataclass
class AgentMessage:
    """Message in agent conversation."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    role: str = "user"
    content: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

# ============================================================================
# BASE AGENT CLASS
# ============================================================================

class Agent(ABC):
    """
    Base class for all AI agents.
    
    Features:
    - ReAct loop (Reasoning + Acting)
    - Tool system with schema validation
    - State persistence with checkpoints
    - Event streaming for observability
    - Sub-agent spawning
    
    Inspired by: OpenHands, AutoGPT, MetaGPT, Roo-Code
    """
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.id = str(uuid.uuid4())[:8]
        self.state = AgentState.IDLE
        self.task_logger: Optional[TaskLogger] = None
        
        # Memory & conversation
        self.messages: List[AgentMessage] = []
        self.conversation_history: List[Dict[str, str]] = []
        
        # Tool registry
        self._tools: Dict[str, Callable] = {}
        self._tool_schemas: Dict[str, Dict] = {}
        
        # Sub-agents (for recursive spawning)
        self._sub_agents: Dict[str, 'Agent'] = {}
        
        # Execution tracking
        self.iteration = 0
        self.thoughts: List[Dict[str, str]] = []
        
        logger.info(f"Initialized {config.name} agent (id={self.id})")
    
    # --- Tool Registration ---
    
    def register_tool(self, name: str, func: Callable, schema: Dict[str, Any]) -> None:
        """Register a tool with schema validation."""
        self._tools[name] = func
        self._tool_schemas[name] = schema
        logger.debug(f"Registered tool: {name}")
    
    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """Get all tool schemas for LLM."""
        return [
            {"name": name, **schema} 
            for name, schema in self._tool_schemas.items()
        ]
    
    # --- Tool Execution ---
    
    async def execute_tool(self, tool_name: str, args: Dict[str, Any]) -> ToolResult:
        """Execute a tool with timing and error handling."""
        if tool_name not in self._tools:
            return ToolResult(
                tool=tool_name, args=args, success=False,
                error=f"Tool '{tool_name}' not found"
            )
        
        start_time = asyncio.get_event_loop().time()
        func = self._tools[tool_name]
        
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(**args)
            else:
                result = func(**args)
            
            duration = (asyncio.get_event_loop().time() - start_time) * 1000
            
            if self.task_logger:
                self.task_logger.log_tool_call(tool_name, args, result)
            
            return ToolResult(
                tool=tool_name, args=args, success=True,
                result=result, duration_ms=duration
            )
        except Exception as e:
            duration = (asyncio.get_event_loop().time() - start_time) * 1000
            error_msg = str(e)
            logger.exception(f"Tool '{tool_name}' failed: {error_msg}")
            
            if self.task_logger:
                self.task_logger.log_tool_call(tool_name, args, error=error_msg)
            
            return ToolResult(
                tool=tool_name, args=args, success=False,
                error=error_msg, duration_ms=duration
            )
    
    # --- Sub-agent Management ---
    
    def spawn_sub_agent(self, agent_type: Type['Agent'], 
                        config: AgentConfig) -> 'Agent':
        """Spawn a sub-agent for specialized tasks."""
        sub_agent = agent_type(config)
        sub_agent._parent = self  # type: ignore
        self._sub_agents[sub_agent.id] = sub_agent
        logger.info(f"{self.config.name} spawned sub-agent {config.name} ({sub_agent.id})")
        return sub_agent
    
    # --- Core ReAct Loop ---
    
    async def think(self) -> str:
        """Think about the next action (reasoning)."""
        raise NotImplementedError
    
    async def act(self) -> Any:
        """Execute the decided action."""
        raise NotImplementedError
    
    async def observe(self, result: Any) -> None:
        """Process the result of an action."""
        self.messages.append(AgentMessage(
            role="system",
            content=f"Observation: {result}",
            metadata={"type": "observation"}
        ))
    
    async def run(self, goal: str) -> Dict[str, Any]:
        """
        Main execution loop (ReAct pattern).
        
        Loop:
        1. THINK: Reason about current state
        2. ACT: Execute tool or respond
        3. OBSERVE: Process result
        """
        self.task_logger = TaskLogger(
            task_id=self.id,
            agent_name=self.config.name
        )
        self.task_logger.log_step("START", f"Goal: {goal}")
        
        self.state = AgentState.THINKING
        self.messages.append(AgentMessage(role="user", content=goal))
        
        try:
            while self.iteration < self.config.max_iterations:
                self.iteration += 1
                
                # THINK
                self.state = AgentState.THINKING
                thought = await self.think()
                self.thoughts.append({"thought": thought, "step": self.iteration})
                self.task_logger.log_thought(thought, "Reasoning step")
                
                # ACT
                self.state = AgentState.ACTING
                result = await self.act()
                
                # OBSERVE
                self.state = AgentState.WAITING
                await self.observe(result)
                
                # Check completion
                if self._is_done(result):
                    self.state = AgentState.DONE
                    self.task_logger.log_step("DONE", f"Result: {str(result)[:200]}")
                    return {"success": True, "result": result, "iterations": self.iteration}
            
            # Max iterations reached
            self.state = AgentState.DONE
            return {"success": False, "error": "Max iterations reached", "iterations": self.iteration}
            
        except Exception as e:
            self.state = AgentState.ERROR
            logger.exception(f"Agent {self.config.name} failed")
            return {"success": False, "error": str(e)}
        finally:
            self.task_logger.end()
    
    def _is_done(self, result: Any) -> bool:
        """Check if the task is complete."""
        return False  # Override in subclasses
    
    # --- Streaming & Events ---
    
    async def stream(self, goal: str):
        """Stream execution progress."""
        result = await self.run(goal)
        yield {"type": "done", "data": result}

# ============================================================================
# SPECIALIZED AGENT MIXINS
# ============================================================================

class CodeAgentMixin:
    """Mixin for agents with code editing capabilities."""
    
    def register_code_tools(self) -> None:
        """Register code editing tools."""
        self.register_tool("read_file", self._read_file, {
            "description": "Read file contents",
            "parameters": {
                "type": "object",
                "properties": {"path": {"type": "string"}},
                "required": ["path"]
            }
        })
        
        self.register_tool("write_file", self._write_file, {
            "description": "Write content to file",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"}
                },
                "required": ["path", "content"]
            }
        })
        
        self.register_tool("edit_file", self._edit_file, {
            "description": "Edit file using search/replace",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "search": {"type": "string"},
                    "replace": {"type": "string"}
                },
                "required": ["path", "search", "replace"]
            }
        })
    
    @trace()
    def _read_file(self, path: str) -> str:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    
    @trace()
    def _write_file(self, path: str, content: str) -> str:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Written to {path}"
    
    @trace()
    def _edit_file(self, path: str, search: str, replace: str) -> str:
        content = self._read_file(path)
        if search not in content:
            raise ValueError(f"Search string not found in {path}")
        content = content.replace(search, replace)
        self._write_file(path, content)
        return f"Edited {path}"


class BrowserAgentMixin:
    """Mixin for agents with browser automation capabilities."""
    
    def register_browser_tools(self, browser_controller) -> None:
        """Register browser automation tools."""
        self._browser = browser_controller
        
        self.register_tool("navigate", self._navigate, {
            "description": "Navigate to URL",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string"}},
                "required": ["url"]
            }
        })
        
        self.register_tool("click", self._click, {
            "description": "Click element by selector",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string"},
                    "x": {"type": "number"},
                    "y": {"type": "number"}
                }
            }
        })
        
        self.register_tool("type", self._type_text, {
            "description": "Type text into element",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string"},
                    "text": {"type": "string"}
                },
                "required": ["text"]
            }
        })
        
        self.register_tool("screenshot", self._screenshot, {
            "description": "Take screenshot",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string"}}
            }
        })
    
    async def _navigate(self, url: str) -> str:
        await self._browser.navigate(url)
        return f"Navigated to {url}"
    
    async def _click(self, selector: str = None, x: int = None, y: int = None) -> str:
        if x is not None and y is not None:
            await self._browser.click_coords(x, y)
        elif selector:
            await self._browser.click_element(selector)
        return f"Clicked element"
    
    async def _type_text(self, selector: str, text: str) -> str:
        await self._browser.type_text(selector, text)
        return f"Typed text into {selector}"
    
    async def _screenshot(self, name: str = "screenshot.png") -> str:
        path = await self._browser.screenshot(name)
        return f"Screenshot saved to {path}"

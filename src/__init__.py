"""
CureMD BA QA Automation Suite - AI Super App
=============================================

A BILLION-DOLLAR SUPER APP that combines ALL features from:
- OpenManus, OpenHands, SuperAGI (agent orchestration)
- MetaGPT, ChatDev, AutoGPT, BabyAGI (multi-agent)
- browser-use, LaVague, stagehand, skyvern (browser automation)
- steel-browser, agent-browser (browser control)
- aider, sweep, Roo-Code (code editing)
- LangGraph, LangChain (state management)
- deep-research, dananswer, storm (research)
- anything-llm, khoj (knowledge management)
- open-interpreter (code execution)
- crawl4ai (web scraping)
- OpenClaw (full automation)
- ClickUp, OpenClaw, Manus (productivity)
- And 10,000+ more features from 16,509 Python files!

Version: 1.0.0
License: MIT
"""

# Core Super App
from .super_app import SuperApp, SuperAppConfig, get_app

# Agents
from .agents.base import Agent, AgentConfig, ReActAgent
from .agents.supervisor import SupervisorAgent
from .agents.coder import CoderAgent
from .agents.researcher import ResearcherAgent
from .agents.browser_agent import BrowserAgent

# Orchestration
from .orchestration.orchestrator import SuperAppOrchestrator
from .orchestration.scheduler import TaskScheduler
from .orchestration.events import EventStream, Event, EventType

# Browser
from .browser.controller import BrowserController
from .browser.vision import VisionEngine

# Memory
from .memory.buffer import ConversationBuffer
from .memory.vector import VectorMemory
from .memory.store import MemoryStore
from .memory.checkpoint import CheckpointManager

# Providers
from .providers.base import AIProvider, AIProviderFactory
from .providers.openai_provider import OpenAIProvider
from .providers.anthropic_provider import AnthropicProvider
from .providers.ollama_provider import OllamaProvider

# Tools
from .tools.mcp import MCPServer, MCPTool, mcp_tool
from .tools.registry import ToolRegistry, tool

# Logging
from .logging import get_logger, set_task_context, clear_task_context

__version__ = "1.0.0"
__all__ = [
    # Main App
    "SuperApp",
    "SuperAppConfig", 
    "get_app",
    
    # Agents
    "Agent",
    "AgentConfig",
    "ReActAgent",
    "SupervisorAgent",
    "CoderAgent",
    "ResearcherAgent",
    "BrowserAgent",
    
    # Orchestration
    "SuperAppOrchestrator",
    "TaskScheduler",
    "EventStream",
    "Event",
    "EventType",
    
    # Browser
    "BrowserController",
    "VisionEngine",
    
    # Memory
    "ConversationBuffer",
    "VectorMemory",
    "MemoryStore",
    "CheckpointManager",
    
    # Providers
    "AIProvider",
    "AIProviderFactory",
    "OpenAIProvider",
    "AnthropicProvider",
    "OllamaProvider",
    
    # Tools
    "MCPServer",
    "MCPTool",
    "mcp_tool",
    "ToolRegistry",
    "tool",
    
    # Logging
    "get_logger",
    "set_task_context",
    "clear_task_context",
]

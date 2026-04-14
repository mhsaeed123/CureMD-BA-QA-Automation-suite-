"""
CureMD BA QA Automation Suite - AI Super App
============================================
A monolith multi-module AI agent that combines features from:
- OpenManus/OpenClaw: General AI agents
- MetaGPT: Multi-agent collaboration
- AutoGPT/BabyAGI: Autonomous task execution
- LangGraph: State orchestration
- browser-use: Browser automation
- aider/sweep: Code editing
- Roo-Code: VS Code extension agent
- OpenHands: Coding agent
- And many more...

Author: AI Super App Team
Version: 1.0.0
"""

__version__ = "1.0.0"
__author__ = "AI Super App Team"

from .agents import Agent, Supervisor, Coder, Researcher, BrowserAgent
from .orchestration import SuperAppOrchestrator, TaskGraph
from .browser import BrowserController, VisionEngine
from .coder import CodeEditor, SearchReplaceBlock, FuzzyPatcher
from .memory import MemoryStore, VectorMemory, ConversationBuffer

__all__ = [
    "Agent",
    "Supervisor",
    "Coder",
    "Researcher",
    "BrowserAgent",
    "SuperAppOrchestrator",
    "TaskGraph",
    "BrowserController",
    "VisionEngine",
    "CodeEditor",
    "SearchReplaceBlock",
    "FuzzyPatcher",
    "MemoryStore",
    "VectorMemory",
    "ConversationBuffer",
]

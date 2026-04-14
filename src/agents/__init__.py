"""
Agents Module - Core AI Agent Implementations
==============================================
Combines features from: OpenManus, MetaGPT, AutoGPT, BabyAGI, OpenHands, Roo-Code
"""

from .base import Agent, AgentConfig, AgentState
from .supervisor import SupervisorAgent
from .coder import CoderAgent
from .researcher import ResearcherAgent
from .browser_agent import BrowserAgent

__all__ = [
    "Agent", "AgentConfig", "AgentState",
    "SupervisorAgent", "CoderAgent", "ResearcherAgent", "BrowserAgent"
]

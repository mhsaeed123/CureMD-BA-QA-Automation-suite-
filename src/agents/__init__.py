"""
CureMD BA QA Automation Suite - Agents Module
=============================================
Base agent classes and specialized agents for QA automation.

Author: CureMD BA QA Team
Version: 1.0.0
"""

from agents.base_agent import BaseAgent, AgentStatus
from agents.qa_agent import QAAgent, TestResult
from agents.automation_agent import AutomationAgent, WorkflowStep

__all__ = [
    'BaseAgent',
    'AgentStatus',
    'QAAgent',
    'TestResult',
    'AutomationAgent',
    'WorkflowStep',
]

__version__ = '1.0.0'
"""
Orchestration Module - Super App Orchestrator
=============================================
Inspired by: LangGraph, MetaGPT, SuperAGI
Features:
- State graph with channels
- Task queue and scheduling
- Event streaming
- Checkpoint/restore
- Human-in-the-loop interrupts
"""

from .orchestrator import SuperAppOrchestrator, TaskGraph, TaskNode, StateChannel
from .scheduler import TaskScheduler, CeleryTaskScheduler
from .events import EventStream, Event

__all__ = [
    "SuperAppOrchestrator",
    "TaskGraph",
    "TaskNode",
    "StateChannel",
    "TaskScheduler",
    "CeleryTaskScheduler",
    "EventStream",
    "Event"
]

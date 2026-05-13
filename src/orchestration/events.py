"""
Event Stream - Event Sourcing for Agent Trajectories
=====================================================
Inspired by: OpenHands event stream
Features:
- Immutable event log
- Trajectory replay
- Multi-subscriber streaming
"""

import asyncio
import json
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from app_logging import get_logger

logger = get_logger("orchestration.events")

class EventType(Enum):
    """Types of events in the stream."""
    AGENT_START = "agent_start"
    AGENT_END = "agent_end"
    THOUGHT = "thought"
    ACTION = "action"
    OBSERVATION = "observation"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    STATE_UPDATE = "state_update"
    ERROR = "error"
    CHECKPOINT = "checkpoint"

@dataclass
class Event:
    """An event in the event stream."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: EventType = EventType.STATE_UPDATE
    timestamp: datetime = field(default_factory=datetime.now)
    task_id: str = ""
    agent_id: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type.value,
            "timestamp": self.timestamp.isoformat(),
            "task_id": self.task_id,
            "agent_id": self.agent_id,
            "data": self.data,
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict())

class EventSubscriber(ABC):
    """Subscriber for event stream."""
    
    @abstractmethod
    async def on_event(self, event: Event) -> None:
        """Handle an event."""
        pass

class EventStream:
    """
    Event stream for agent trajectory tracking.
    Inspired by OpenHands event stream.
    
    Features:
    - Immutable event log
    - Multi-subscriber support
    - Async event dispatch
    - Trajectory replay
    """
    
    def __init__(self, task_id: str = None):
        self.task_id = task_id or str(uuid.uuid4())[:8]
        self.events: List[Event] = []
        self.subscribers: List[EventSubscriber] = []
        self._lock = asyncio.Lock()
        
        logger.debug(f"EventStream created: {self.task_id}")
    
    async def publish(self, event: Event) -> None:
        """Publish an event to the stream."""
        async with self._lock:
            event.task_id = self.task_id
            self.events.append(event)
        
        # Notify subscribers
        for subscriber in self.subscribers:
            try:
                await subscriber.on_event(event)
            except Exception as e:
                logger.exception(f"Subscriber error: {e}")
    
    def subscribe(self, subscriber: EventSubscriber) -> None:
        """Subscribe to the event stream."""
        self.subscribers.append(subscriber)
    
    def unsubscribe(self, subscriber: EventSubscriber) -> None:
        """Unsubscribe from the event stream."""
        if subscriber in self.subscribers:
            self.subscribers.remove(subscriber)
    
    def get_events(self, 
                   event_type: EventType = None,
                   agent_id: str = None) -> List[Event]:
        """Get events with optional filtering."""
        events = self.events
        
        if event_type:
            events = [e for e in events if e.type == event_type]
        if agent_id:
            events = [e for e in events if e.agent_id == agent_id]
        
        return events
    
    def replay(self) -> List[Dict]:
        """Get all events for replay."""
        return [e.to_dict() for e in self.events]
    
    # Convenience methods
    
    async def log_thought(self, agent_id: str, thought: str, reasoning: str = "") -> None:
        """Log an agent thought."""
        await self.publish(Event(
            type=EventType.THOUGHT,
            agent_id=agent_id,
            data={"thought": thought, "reasoning": reasoning}
        ))
    
    async def log_action(self, agent_id: str, action: str, params: Dict = None) -> None:
        """Log an agent action."""
        await self.publish(Event(
            type=EventType.ACTION,
            agent_id=agent_id,
            data={"action": action, "params": params or {}}
        ))
    
    async def log_observation(self, agent_id: str, observation: str) -> None:
        """Log an environment observation."""
        await self.publish(Event(
            type=EventType.OBSERVATION,
            agent_id=agent_id,
            data={"observation": observation}
        ))
    
    async def log_tool_call(self, agent_id: str, tool: str, 
                           args: Dict, result: Any = None,
                           error: str = None) -> None:
        """Log a tool call."""
        await self.publish(Event(
            type=EventType.TOOL_CALL,
            agent_id=agent_id,
            data={
                "tool": tool,
                "args": args,
                "result": str(result)[:500] if result else None,
                "error": error
            }
        ))


class CheckpointSubscriber(EventSubscriber):
    """Subscriber that creates checkpoints at intervals."""
    
    def __init__(self, event_stream: EventStream, interval: int = 10):
        self.event_stream = event_stream
        self.interval = interval
        self.checkpoints: List[Dict] = []
    
    async def on_event(self, event: Event) -> None:
        """Create checkpoint every N events."""
        if len(self.event_stream.events) % self.interval == 0:
            checkpoint = {
                "index": len(self.event_stream.events),
                "timestamp": datetime.now().isoformat(),
                "events": self.event_stream.replay()
            }
            self.checkpoints.append(checkpoint)
            logger.info(f"Checkpoint created at event {checkpoint['index']}")
    
    def restore(self, checkpoint_index: int) -> List[Event]:
        """Restore state from checkpoint."""
        if 0 <= checkpoint_index < len(self.checkpoints):
            checkpoint = self.checkpoints[checkpoint_index]
            events = checkpoint["events"]
            # Reconstruct Event objects
            return [
                Event(
                    id=e["id"],
                    type=EventType(e["type"]),
                    timestamp=datetime.fromisoformat(e["timestamp"]),
                    agent_id=e["agent_id"],
                    data=e["data"]
                )
                for e in events
            ]
        return []

"""
Agent Memory
============
Short-term conversation buffer + long-term vector store.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class ConversationBuffer:
    """Short-term sliding-window conversation memory."""

    def __init__(self, max_messages: int = 100):
        self.max_messages = max_messages
        self.messages: List[Dict[str, Any]] = []

    def add(self, role: str, content: str, metadata: Optional[Dict] = None):
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {},
        })
        # Sliding window
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]

    def get_messages(self) -> List[Dict[str, Any]]:
        return self.messages.copy()

    def to_llm_format(self) -> List[Dict[str, str]]:
        """Strip to role+content only for LLM calls."""
        return [{"role": m["role"], "content": m["content"]} for m in self.messages]

    def clear(self):
        self.messages.clear()

    def __len__(self) -> int:
        return len(self.messages)


class KeyValueStore:
    """Persistent JSON-backed key-value store."""

    def __init__(self, path: Path = None):
        self.path = path or Path("data/memory_store.json")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._store: Dict[str, Any] = {}
        self._load()

    def _load(self):
        if self.path.exists():
            with open(self.path) as f:
                self._store = json.load(f)

    def _save(self):
        with open(self.path, "w") as f:
            json.dump(self._store, f, indent=2, default=str)

    def set(self, key: str, value: Any):
        self._store[key] = value
        self._save()

    def get(self, key: str, default: Any = None) -> Any:
        return self._store.get(key, default)

    def delete(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
            self._save()
            return True
        return False

    def keys(self) -> List[str]:
        return list(self._store.keys())


class AgentMemory:
    """
    Combined memory for an agent session.
    - buffer: short-term conversation context
    - store: long-term persistent key-value memory
    """

    def __init__(self, max_buffer: int = 100, store_path: Optional[Path] = None):
        self.buffer = ConversationBuffer(max_messages=max_buffer)
        self.store = KeyValueStore(path=store_path)

    def remember(self, key: str, value: Any):
        """Store a long-term memory."""
        self.store.set(key, value)

    def recall(self, key: str, default: Any = None) -> Any:
        """Retrieve a long-term memory."""
        return self.store.get(key, default)

    def add_message(self, role: str, content: str, **metadata):
        """Add to conversation buffer."""
        self.buffer.add(role, content, metadata=metadata)

    def get_context(self) -> List[Dict[str, str]]:
        """Get LLM-formatted conversation context."""
        return self.buffer.to_llm_format()

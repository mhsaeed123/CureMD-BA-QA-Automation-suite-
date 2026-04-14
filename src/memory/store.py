"""
Memory Store - Long-term Key-Value Storage
==========================================
"""

import json
from pathlib import Path
from typing import Any, Dict, Optional

class MemoryStore:
    """Persistent key-value memory store."""
    
    def __init__(self, storage_path: str = "memory_store.json"):
        self.storage_path = Path(storage_path)
        self._store: Dict[str, Any] = {}
        self._load()
    
    def _load(self) -> None:
        """Load from disk."""
        if self.storage_path.exists():
            with open(self.storage_path, 'r') as f:
                self._store = json.load(f)
    
    def _save(self) -> None:
        """Save to disk."""
        with open(self.storage_path, 'w') as f:
            json.dump(self._store, f, indent=2, default=str)
    
    def set(self, key: str, value: Any) -> None:
        """Set a value."""
        self._store[key] = value
        self._save()
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a value."""
        return self._store.get(key, default)
    
    def delete(self, key: str) -> bool:
        """Delete a key."""
        if key in self._store:
            del self._store[key]
            self._save()
            return True
        return False
    
    def keys(self) -> list:
        """Get all keys."""
        return list(self._store.keys())
    
    def clear(self) -> None:
        """Clear all data."""
        self._store.clear()
        self._save()

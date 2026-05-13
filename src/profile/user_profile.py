"""
User Profile
============
Stores user profile, ambitions, and recurring-task ledger.
Used by the meta-agent to tailor self-authored modules.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

PROFILE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "user_profile.json"


class UserProfile:
    """User profile for personalization."""

    def __init__(self, path: Path = PROFILE_PATH):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._data: Dict[str, Any] = {
            "name": "",
            "role": "",
            "domain": "",
            "ambitions": [],
            "recurring_tasks": [],
            "preferences": {
                "default_task_class": "chat",
                "preferred_model": None,
            },
            "context_files": [],
        }
        self._load()

    def _load(self):
        if self.path.exists():
            with open(self.path) as f:
                saved = json.load(f)
            self._data.update(saved)

    def _save(self):
        with open(self.path, "w") as f:
            json.dump(self._data, f, indent=2)

    # --- Getters/Setters ---

    @property
    def name(self) -> str:
        return self._data.get("name", "")

    @name.setter
    def name(self, value: str):
        self._data["name"] = value
        self._save()

    @property
    def role(self) -> str:
        return self._data.get("role", "")

    @role.setter
    def role(self, value: str):
        self._data["role"] = value
        self._save()

    @property
    def domain(self) -> str:
        return self._data.get("domain", "")

    @domain.setter
    def domain(self, value: str):
        self._data["domain"] = value
        self._save()

    @property
    def ambitions(self) -> List[str]:
        return self._data.get("ambitions", [])

    def add_ambition(self, ambition: str):
        self._data.setdefault("ambitions", []).append(ambition)
        self._save()

    @property
    def recurring_tasks(self) -> List[Dict]:
        return self._data.get("recurring_tasks", [])

    def add_recurring_task(self, task: Dict):
        self._data.setdefault("recurring_tasks", []).append(task)
        self._save()

    @property
    def preferences(self) -> Dict:
        return self._data.get("preferences", {})

    def set_preference(self, key: str, value: Any):
        self._data.setdefault("preferences", {})[key] = value
        self._save()

    def to_dict(self) -> Dict:
        return self._data.copy()

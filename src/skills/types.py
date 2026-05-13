"""
Skill Types
===========
Data models for skill packs.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class Skill:
    """A single skill: a prompt template + optional tool bindings."""

    name: str
    description: str
    prompt_template: str
    tools: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def render(self, **kwargs) -> str:
        """Render the prompt template with variables."""
        return self.prompt_template.format(**kwargs)


@dataclass
class SkillPack:
    """
    A folder-based skill pack (like OpenClaude).
    Contains one or more skills, plus optional code.
    """

    name: str
    description: str
    path: Path
    skills: Dict[str, Skill] = field(default_factory=dict)
    tools: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

"""
Skill Loader
============
Discovers and loads skill packs from the filesystem.
"""

import logging
from pathlib import Path
from typing import Dict, Optional

import yaml

from .types import Skill, SkillPack

logger = logging.getLogger(__name__)

SKILLS_DIR = Path(__file__).resolve().parent.parent.parent / "skills"


class SkillLoader:
    """Load skill packs from disk."""

    def __init__(self, skills_dir: Path = SKILLS_DIR):
        self.skills_dir = skills_dir
        self._packs: Dict[str, SkillPack] = {}

    def discover(self) -> Dict[str, SkillPack]:
        """Scan skills directory for skill packs."""
        if not self.skills_dir.exists():
            logger.info(f"Skills directory not found: {self.skills_dir}")
            return {}

        for pack_dir in self.skills_dir.iterdir():
            if pack_dir.is_dir() and not pack_dir.name.startswith("_"):
                pack = self._load_pack(pack_dir)
                if pack:
                    self._packs[pack.name] = pack

        return self._packs

    def _load_pack(self, path: Path) -> Optional[SkillPack]:
        """Load a skill pack from a directory."""
        manifest = path / "manifest.yaml"
        if not manifest.exists():
            # Try manifest.yml
            manifest = path / "manifest.yml"
        if not manifest.exists():
            logger.debug(f"No manifest in {path}")
            return None

        with open(manifest) as f:
            data = yaml.safe_load(f) or {}

        pack = SkillPack(
            name=data.get("name", path.name),
            description=data.get("description", ""),
            path=path,
            tools=data.get("tools", []),
            metadata=data,
        )

        # Load individual skills from prompt files
        prompts_dir = path / "prompts"
        if prompts_dir.exists():
            for pf in prompts_dir.glob("*.md"):
                skill = Skill(
                    name=pf.stem,
                    description=f"Prompt: {pf.stem}",
                    prompt_template=pf.read_text(encoding="utf-8"),
                )
                pack.skills[skill.name] = skill

        return pack

    def get(self, name: str) -> Optional[SkillPack]:
        return self._packs.get(name)

    def get_all(self) -> Dict[str, SkillPack]:
        return self._packs.copy()

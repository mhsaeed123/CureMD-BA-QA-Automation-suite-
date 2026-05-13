"""Tests for core.config module."""
import os
import pytest
from pathlib import Path

# Ensure project root on path
import sys
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.config import Settings, get_settings, reload_settings


def test_settings_creation():
    """Settings can be created with defaults."""
    s = Settings()
    assert s.llm is not None
    assert s.db is not None
    assert s.auth is not None


def test_settings_defaults():
    """Default values are sensible."""
    s = Settings()
    assert s.llm.daily_budget_usd == 5.0
    assert s.llm.max_tokens == 4096
    assert s.llm.ollama_host == "http://localhost:11434"


def test_get_settings_singleton():
    """get_settings returns the same object."""
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2


def test_reload_settings():
    """reload_settings creates a new object."""
    s1 = get_settings()
    s2 = reload_settings()
    assert s1 is not s2


def test_workspace_dir_exists():
    """Workspace directory is created automatically."""
    s = Settings()
    assert s.workspace_dir.exists()

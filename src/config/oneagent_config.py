"""
OneAgent Configuration
=====================
Single source of truth for all settings.
Loads from .env, environment variables, and ranking.yaml.
"""

import os
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


# Root of the OneAgent project
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
CACHE_DIR = PROJECT_ROOT / "cache"
WORKSPACE_DIR = PROJECT_ROOT / "workspace"


def _ensure_dirs():
    """Create standard directories if they don't exist."""
    for d in [DATA_DIR, CACHE_DIR, WORKSPACE_DIR]:
        d.mkdir(parents=True, exist_ok=True)


_ensure_dirs()


class LLMSettings(BaseSettings):
    """LLM-related settings."""

    # API Keys
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    ollama_host: str = Field(default="http://localhost:11434", alias="OLLAMA_HOST")

    # Defaults
    default_model: str = Field(default="gpt-4o-mini", alias="LLM_DEFAULT_MODEL")
    code_model: Optional[str] = Field(default=None, alias="LLM_CODE_MODEL")
    reason_model: Optional[str] = Field(default=None, alias="LLM_REASON_MODEL")
    max_tokens: int = Field(default=4096, alias="DEFAULT_MAX_TOKENS")

    # Budget
    daily_budget_usd: float = Field(default=5.0, alias="DAILY_BUDGET_USD")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


class DatabaseSettings(BaseSettings):
    """Database settings."""

    database_url: str = Field(
        default="sqlite+aiosqlite:///./data/oneagent.db", alias="DATABASE_URL"
    )
    redis_url: str = Field(default="redis://localhost:6379", alias="REDIS_URL")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


class AuthSettings(BaseSettings):
    """Authentication settings."""

    secret_key: str = Field(default="change-me-in-production", alias="SECRET_KEY")
    keycloak_base_url: str = Field(default="", alias="KEYCLOAK_BASE_URL")
    keycloak_realm: str = Field(default="", alias="KEYCLOAK_REALM")
    keycloak_client_id: str = Field(default="", alias="KEYCLOAK_CLIENT_ID")
    keycloak_client_secret: str = Field(default="", alias="KEYCLOAK_CLIENT_SECRET")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


class Settings(BaseSettings):
    """Top-level OneAgent settings. One object to rule them all."""

    llm: LLMSettings = Field(default_factory=LLMSettings)
    db: DatabaseSettings = Field(default_factory=DatabaseSettings)
    auth: AuthSettings = Field(default_factory=AuthSettings)

    workspace_dir: Path = Field(default=WORKSPACE_DIR, alias="WORKSPACE_DIR")
    cache_dir: Path = Field(default=CACHE_DIR, alias="CACHE_DIR")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Return the global Settings singleton."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reload_settings() -> Settings:
    """Force-reload settings from env/.env."""
    global _settings
    _settings = Settings()
    return _settings

"""
SQLModel Models
===============
Shared database models for OneAgent.
"""

from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime


class Setting(SQLModel, table=True):
    """Key-value settings store."""
    key: str = Field(primary_key=True)
    value: str
    description: Optional[str] = None
    category: str = "general"
    updated_at: Optional[str] = Field(default_factory=lambda: datetime.now().isoformat())


class ModuleRegistration(SQLModel, table=True):
    """Registered modules (including self-authored ones)."""
    name: str = Field(primary_key=True)
    version: str = "0.1.0"
    description: str = ""
    enabled: bool = True
    source: str = "builtin"  # builtin | self-authored | plugin
    manifest_path: Optional[str] = None
    created_at: Optional[str] = Field(default_factory=lambda: datetime.now().isoformat())


class SelfAuthoredModule(SQLModel, table=True):
    """Provenance tracking for self-authored modules."""
    name: str = Field(primary_key=True)
    prompt: str = ""
    model_used: str = ""
    tests_passed: bool = False
    status: str = "draft"  # draft | testing | approved | rejected
    code_path: Optional[str] = None
    created_at: Optional[str] = Field(default_factory=lambda: datetime.now().isoformat())
    approved_at: Optional[str] = None

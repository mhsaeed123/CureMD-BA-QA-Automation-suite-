"""
Session and Context Data Models
Based on Projects/Scripts/models.py
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class SessionStatus(str, Enum):
    """Session status enumeration."""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Message(BaseModel):
    """A single message in a session."""
    role: str  # "user", "assistant", "system"
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ContextFile(BaseModel):
    """A context file attached to a session."""
    filename: str
    content: str = ""
    file_type: str = "text"
    size: int = 0
    uploaded_at: datetime = Field(default_factory=datetime.now)


class GitHubRepo(BaseModel):
    """GitHub repository reference."""
    name: str
    owner: str
    url: str
    description: Optional[str] = None
    private: bool = False


class JulesSession(BaseModel):
    """Jules/AI session with conversation history."""
    session_id: str
    title: str
    status: SessionStatus = SessionStatus.ACTIVE
    messages: List[Message] = Field(default_factory=list)
    context_files: List[str] = Field(default_factory=list)
    github_repo: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CreateSessionRequest(BaseModel):
    """Request to create a new session."""
    title: str
    initial_context: Optional[str] = None
    github_repo: Optional[str] = None
    context_files: Optional[List[str]] = None


class SendMessageRequest(BaseModel):
    """Request to send a message to a session."""
    content: str
    include_context: bool = True

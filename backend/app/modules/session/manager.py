"""
Session Manager - Local session storage and synchronization
Based on Projects/Scripts/session_manager.py
"""
import json
import aiofiles
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime
from .models import JulesSession, Message, SessionStatus
from ..core.config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages local storage and synchronization of AI sessions."""

    def __init__(self, sessions_dir: Optional[str] = None):
        self.sessions_dir = Path(sessions_dir or settings.sessions_dir)
        self.sessions_dir.mkdir(parents=True, exist_ok=True)

    async def save_session(self, session: JulesSession) -> bool:
        """Save a session to local storage."""
        try:
            file_path = self.sessions_dir / f"{session.session_id}.json"
            session.updated_at = datetime.now()
            session_dict = session.model_dump(mode="json")

            async with aiofiles.open(file_path, "w", encoding="utf-8") as f:
                await f.write(json.dumps(session_dict, indent=2, default=str))

            logger.info(f"Saved session {session.session_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving session: {e}")
            return False

    async def load_session(self, session_id: str) -> Optional[JulesSession]:
        """Load a session from local storage."""
        try:
            file_path = self.sessions_dir / f"{session_id}.json"

            if not file_path.exists():
                return None

            async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                content = await f.read()
                session_dict = json.loads(content)

            return JulesSession(**session_dict)
        except Exception as e:
            logger.error(f"Error loading session: {e}")
            return None

    async def list_sessions(self) -> List[JulesSession]:
        """List all locally stored sessions."""
        try:
            sessions = []
            for file_path in self.sessions_dir.glob("*.json"):
                async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                    content = await f.read()
                    session_dict = json.loads(content)
                    sessions.append(JulesSession(**session_dict))
            return sessions
        except Exception as e:
            logger.error(f"Error listing sessions: {e}")
            return []

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session from local storage."""
        try:
            file_path = self.sessions_dir / f"{session_id}.json"
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted session {session_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting session: {e}")
            return False

    async def export_session_markdown(self, session_id: str) -> Optional[str]:
        """Export a session as markdown text."""
        try:
            session = await self.load_session(session_id)
            if not session:
                return None

            md_lines = [
                f"# {session.title}",
                "",
                f"**Session ID:** {session.session_id}",
                f"**Status:** {session.status}",
                f"**Created:** {session.created_at}",
                f"**GitHub Repo:** {session.github_repo or 'None'}",
                "",
                "## Context Files",
                ""
            ]

            if session.context_files:
                for file in session.context_files:
                    md_lines.append(f"- {file}")
            else:
                md_lines.append("(No context files)")

            md_lines.extend([
                "",
                "## Conversation",
                ""
            ])

            for msg in session.messages:
                role_name = "User" if msg.role == "user" else "Assistant"
                md_lines.extend([
                    f"### {role_name}",
                    "",
                    msg.content,
                    ""
                ])

            return "\n".join(md_lines)
        except Exception as e:
            logger.error(f"Error exporting session: {e}")
            return None

    async def create_session(
        self,
        title: str,
        initial_context: Optional[str] = None,
        github_repo: Optional[str] = None,
        context_files: Optional[List[str]] = None
    ) -> JulesSession:
        """Create a new session."""
        import uuid

        session = JulesSession(
            session_id=str(uuid.uuid4()),
            title=title,
            status=SessionStatus.ACTIVE,
            context_files=context_files or [],
            github_repo=github_repo,
            messages=[]
        )

        if initial_context:
            session.messages.append(
                Message(role="user", content=initial_context)
            )

        await self.save_session(session)
        return session

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[dict] = None
    ) -> bool:
        """Add a message to a session."""
        session = await self.load_session(session_id)
        if not session:
            return False

        session.messages.append(
            Message(role=role, content=content, metadata=metadata or {})
        )
        await self.save_session(session)
        return True

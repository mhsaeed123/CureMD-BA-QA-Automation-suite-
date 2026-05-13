"""
Database Setup
==============
SQLModel + async SQLite.
"""

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from typing import AsyncGenerator

from config import get_settings


def get_sync_engine():
    """Get synchronous engine (for migrations)."""
    settings = get_settings()
    url = settings.db.database_url
    if "+aiosqlite" in url:
        url = url.replace("+aiosqlite", "")
    return create_engine(url, echo=False)


def create_tables():
    """Create all tables."""
    engine = get_sync_engine()
    SQLModel.metadata.create_all(engine)


def get_session():
    """Get a synchronous session."""
    engine = get_sync_engine()
    with Session(engine) as session:
        yield session


async def get_async_session() -> AsyncGenerator:
    """Get an async session."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    settings = get_settings()
    engine = create_async_engine(settings.db.database_url, echo=False)
    async with AsyncSession(engine) as session:
        yield session

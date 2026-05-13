"""
Response Cache
==============
SQLite-based prompt+response cache keyed by content hash.
Repeat identical requests cost $0.
"""

import json
import logging
import sqlite3
from pathlib import Path
from typing import Optional

from .providers.base import AIResponse

logger = logging.getLogger(__name__)

DEFAULT_CACHE_DB = Path(__file__).resolve().parent.parent.parent / "data" / "llm_cache.db"


class ResponseCache:
    """SQLite-backed LLM response cache."""

    def __init__(self, db_path: Path = DEFAULT_CACHE_DB):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn: Optional[sqlite3.Connection] = None
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(str(self.db_path))
        return self._conn

    def _init_db(self):
        conn = self._get_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                model TEXT NOT NULL,
                provider TEXT NOT NULL,
                usage TEXT NOT NULL DEFAULT '{}',
                finish_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

    def get(self, key: str) -> Optional[AIResponse]:
        """Look up a cached response."""
        conn = self._get_conn()
        row = conn.execute(
            "SELECT content, model, provider, usage, finish_reason FROM cache WHERE key = ?",
            (key,),
        ).fetchone()
        if row is None:
            return None
        content, model, provider, usage_json, finish_reason = row
        return AIResponse(
            content=content,
            model=model,
            provider=provider,
            usage=json.loads(usage_json),
            finish_reason=finish_reason,
        )

    def set(self, key: str, response: AIResponse):
        """Cache a response."""
        conn = self._get_conn()
        conn.execute(
            """INSERT OR REPLACE INTO cache (key, content, model, provider, usage, finish_reason)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                key,
                response.content,
                response.model,
                response.provider,
                json.dumps(response.usage),
                response.finish_reason,
            ),
        )
        conn.commit()

    def clear(self):
        """Clear the entire cache."""
        conn = self._get_conn()
        conn.execute("DELETE FROM cache")
        conn.commit()

    def stats(self) -> dict:
        """Return cache statistics."""
        conn = self._get_conn()
        count = conn.execute("SELECT COUNT(*) FROM cache").fetchone()[0]
        return {"cached_responses": count}


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_cache: Optional[ResponseCache] = None


def get_cache() -> ResponseCache:
    global _cache
    if _cache is None:
        _cache = ResponseCache()
    return _cache

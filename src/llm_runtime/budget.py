"""
Budget Tracker
==============
Enforces per-day USD ceilings per provider and globally.
Every LLM call is logged here.
"""

import json
import logging
import sqlite3
from datetime import datetime, date
from pathlib import Path
from typing import Dict, List, Optional

from config import get_config as get_settings

logger = logging.getLogger(__name__)

DEFAULT_BUDGET_DB = Path(__file__).resolve().parent.parent.parent / "data" / "budget.db"


class BudgetTracker:
    """Track and enforce LLM spending."""

    def __init__(self, db_path: Path = DEFAULT_BUDGET_DB):
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
            CREATE TABLE IF NOT EXISTS usage_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                date TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                module TEXT,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                cost_usd REAL DEFAULT 0.0,
                cached INTEGER DEFAULT 0
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_log(date)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_log(provider, date)
        """)
        conn.commit()

    # ------------------------------------------------------------------
    # Pricing
    # ------------------------------------------------------------------

    def _estimate_cost(
        self, provider: str, model: str, input_tokens: int, output_tokens: int
    ) -> float:
        """Estimate USD cost from token counts."""
        import yaml
        ranking_path = Path(__file__).parent / "ranking.yaml"
        if ranking_path.exists():
            with open(ranking_path) as f:
                ranking = yaml.safe_load(f)
            pricing = ranking.get("pricing", {}).get(model)
            if pricing:
                return (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000
        return 0.0

    # ------------------------------------------------------------------
    # Recording
    # ------------------------------------------------------------------

    def record(
        self,
        provider: str,
        model: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        module: Optional[str] = None,
        cached: bool = False,
    ):
        """Record an LLM call."""
        cost = self._estimate_cost(provider, model, input_tokens, output_tokens) if not cached else 0.0
        now = datetime.now()
        today = now.strftime("%Y-%m-%d")

        conn = self._get_conn()
        conn.execute(
            """INSERT INTO usage_log (timestamp, date, provider, model, module, input_tokens, output_tokens, cost_usd, cached)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (now.isoformat(), today, provider, model, module, input_tokens, output_tokens, cost, int(cached)),
        )
        conn.commit()

    # ------------------------------------------------------------------
    # Budget checks
    # ------------------------------------------------------------------

    def can_spend(self, provider: str) -> bool:
        """Check if the provider is within daily budget."""
        settings = get_settings()
        daily_limit = settings.llm.daily_budget_usd
        today = date.today().strftime("%Y-%m-%d")

        conn = self._get_conn()
        row = conn.execute(
            "SELECT SUM(cost_usd) FROM usage_log WHERE date = ? AND cached = 0",
            (today,),
        ).fetchone()
        spent = row[0] or 0.0
        return spent < daily_limit

    # ------------------------------------------------------------------
    # Reporting
    # ------------------------------------------------------------------

    def get_daily_spend(self, target_date: Optional[str] = None) -> Dict[str, float]:
        """Get today's spend grouped by provider."""
        today = target_date or date.today().strftime("%Y-%m-%d")
        conn = self._get_conn()
        rows = conn.execute(
            "SELECT provider, SUM(cost_usd) FROM usage_log WHERE date = ? GROUP BY provider",
            (today,),
        ).fetchall()
        return {row[0]: round(row[1], 6) for row in rows}

    def get_daily_detail(self, target_date: Optional[str] = None) -> List[Dict]:
        """Get detailed usage for a day."""
        today = target_date or date.today().strftime("%Y-%m-%d")
        conn = self._get_conn()
        rows = conn.execute(
            """SELECT timestamp, provider, model, module, input_tokens, output_tokens, cost_usd, cached
               FROM usage_log WHERE date = ? ORDER BY timestamp""",
            (today,),
        ).fetchall()
        return [
            {
                "timestamp": r[0], "provider": r[1], "model": r[2], "module": r[3],
                "input_tokens": r[4], "output_tokens": r[5],
                "cost_usd": round(r[6], 6), "cached": bool(r[7]),
            }
            for r in rows
        ]

    def get_total_spend(self, target_date: Optional[str] = None) -> float:
        """Get total USD spent today."""
        today = target_date or date.today().strftime("%Y-%m-%d")
        conn = self._get_conn()
        row = conn.execute(
            "SELECT SUM(cost_usd) FROM usage_log WHERE date = ? AND cached = 0",
            (today,),
        ).fetchone()
        return round(row[0] or 0.0, 6)


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_tracker: Optional[BudgetTracker] = None


def get_budget_tracker() -> BudgetTracker:
    global _tracker
    if _tracker is None:
        _tracker = BudgetTracker()
    return _tracker

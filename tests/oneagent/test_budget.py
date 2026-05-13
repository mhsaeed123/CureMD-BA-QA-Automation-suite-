"""Tests for core.llm.budget module."""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
import tempfile
from datetime import date

from core.llm.budget import BudgetTracker


class TestBudgetTracker:
    """Tests for the budget tracker."""

    def setup_method(self):
        self.tmpdir = tempfile.mkdtemp()
        self.tracker = BudgetTracker(db_path=Path(self.tmpdir) / "test_budget.db")

    def test_record_and_spend(self):
        self.tracker.record(
            provider="openai",
            model="gpt-4o-mini",
            input_tokens=100,
            output_tokens=50,
        )
        spend = self.tracker.get_daily_spend()
        assert "openai" in spend
        assert spend["openai"] > 0

    def test_total_spend(self):
        self.tracker.record("openai", "gpt-4o-mini", 1000, 500)
        total = self.tracker.get_total_spend()
        assert total > 0

    def test_can_spend(self):
        # With default budget of $5, should be able to spend
        assert self.tracker.can_spend("openai") is True

    def test_daily_detail(self):
        self.tracker.record("openai", "gpt-4o-mini", 100, 50, module="test")
        details = self.tracker.get_daily_detail()
        assert len(details) >= 1
        assert details[-1]["provider"] == "openai"
        assert details[-1]["module"] == "test"

    def test_cached_not_counted(self):
        self.tracker.record("openai", "gpt-4o-mini", 100, 50, cached=True)
        total = self.tracker.get_total_spend()
        assert total == 0.0

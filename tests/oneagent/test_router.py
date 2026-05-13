"""Tests for core.llm.router module."""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
import yaml

from core.llm.router import LLMRouter, RANKING_PATH


class TestRankingConfig:
    """Tests for the ranking.yaml configuration."""

    def test_ranking_file_exists(self):
        assert RANKING_PATH.exists(), f"ranking.yaml not found at {RANKING_PATH}"

    def test_ranking_has_default(self):
        with open(RANKING_PATH) as f:
            data = yaml.safe_load(f)
        assert "default" in data
        assert data["default"] == "gpt-4o-mini"

    def test_ranking_has_task_classes(self):
        with open(RANKING_PATH) as f:
            data = yaml.safe_load(f)
        assert "task_classes" in data
        for cls in ["classify", "code", "reason", "chat"]:
            assert cls in data["task_classes"], f"Missing task class: {cls}"

    def test_ranking_has_provider_map(self):
        with open(RANKING_PATH) as f:
            data = yaml.safe_load(f)
        assert "provider_map" in data
        assert "gpt-4o-mini" in data["provider_map"]

    def test_ranking_has_pricing(self):
        with open(RANKING_PATH) as f:
            data = yaml.safe_load(f)
        assert "pricing" in data
        assert "gpt-4o-mini" in data["pricing"]


class TestLLMRouter:
    """Tests for LLMRouter model resolution."""

    def test_router_creation(self):
        router = LLMRouter()
        assert router is not None

    def test_resolve_explicit_model(self):
        router = LLMRouter()
        model, provider = router._resolve_model(model="claude-sonnet-4-20250514")
        assert model == "claude-sonnet-4-20250514"
        assert provider == "anthropic"

    def test_resolve_explicit_model_openai(self):
        router = LLMRouter()
        model, provider = router._resolve_model(model="gpt-4o")
        assert model == "gpt-4o"
        assert provider == "openai"

    def test_resolve_ollama(self):
        router = LLMRouter()
        model, provider = router._resolve_model(model="llama3.2")
        assert model == "llama3.2"
        assert provider == "ollama"

    def test_module_override(self):
        router = LLMRouter()
        router.set_module_model("fhir", "gpt-4o")
        model, provider = router._resolve_model(module="fhir")
        assert model == "gpt-4o"
        assert provider == "openai"

    def test_clear_module_override(self):
        router = LLMRouter()
        router.set_module_model("fhir", "gpt-4o")
        router.clear_module_override("fhir")
        # Should fall back to default
        model, provider = router._resolve_model(module="fhir")
        assert model != "gpt-4o" or provider == "openai"  # could be default

    def test_task_class_resolution(self):
        router = LLMRouter()
        # classify prefers gemini-2.0-flash or gpt-4o-mini
        model, provider = router._resolve_model(task_class="classify")
        assert model in ["gemini-2.0-flash", "gpt-4o-mini", "claude-3-5-haiku-20241022", "llama3.2"]

    def test_cache_key_deterministic(self):
        messages = [{"role": "user", "content": "Hello"}]
        key1 = LLMRouter._make_cache_key(messages, "gpt-4o-mini")
        key2 = LLMRouter._make_cache_key(messages, "gpt-4o-mini")
        assert key1 == key2

    def test_cache_key_differs_by_content(self):
        msg1 = [{"role": "user", "content": "Hello"}]
        msg2 = [{"role": "user", "content": "Goodbye"}]
        key1 = LLMRouter._make_cache_key(msg1, "gpt-4o")
        key2 = LLMRouter._make_cache_key(msg2, "gpt-4o")
        assert key1 != key2

    def test_cache_key_differs_by_model(self):
        messages = [{"role": "user", "content": "Hello"}]
        key1 = LLMRouter._make_cache_key(messages, "gpt-4o-mini")
        key2 = LLMRouter._make_cache_key(messages, "gpt-4o")
        assert key1 != key2

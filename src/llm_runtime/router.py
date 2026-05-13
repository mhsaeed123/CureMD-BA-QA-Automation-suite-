"""
LLM Router
===========
Ranking-based model selection. Picks the cheapest available model
for the given task class, with manual override at every level.

Override hierarchy (highest wins):
  1. call-time `model=` parameter
  2. per-module override (via registry)
  3. per-task-class from ranking.yaml
  4. global default from ranking.yaml
"""

import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from config import get_config as get_settings
from llm_runtime.budget import BudgetTracker, get_budget_tracker
from llm_runtime.cache import ResponseCache, get_cache
from providers.base import AIProvider, AIResponse
from providers.openai_provider import OpenAIProvider
from providers.anthropic_provider import AnthropicProvider
from providers.gemini_provider import GeminiProvider
from providers.ollama_provider import OllamaProvider

logger = logging.getLogger(__name__)

RANKING_PATH = Path(__file__).parent / "ranking.yaml"


def _load_ranking() -> dict:
    """Load ranking.yaml."""
    if RANKING_PATH.exists():
        with open(RANKING_PATH) as f:
            return yaml.safe_load(f)
    return {}


class LLMRouter:
    """
    The single gateway for all LLM calls in OneAgent.

    Usage:
        router = get_router()
        response = await router.ask(
            "What is FHIR?",
            task_class="classify",
        )
    """

    def __init__(self):
        self._ranking = _load_ranking()
        self._providers: Dict[str, AIProvider] = {}
        self._module_overrides: Dict[str, str] = {}  # module_name â†’ model
        self._budget = get_budget_tracker()
        self._cache = get_cache()
        self._initialized = False

    # ------------------------------------------------------------------
    # Initialization
    # ------------------------------------------------------------------

    def _ensure_providers(self):
        """Lazy-init providers from settings."""
        if self._initialized:
            return
        import os
        settings = get_settings()
        llm = settings.llm

        # Read API keys from environment (works with both config styles)
        openai_key = getattr(llm, 'openai_api_key', None) or os.environ.get('OPENAI_API_KEY')
        anthropic_key = getattr(llm, 'anthropic_api_key', None) or os.environ.get('ANTHROPIC_API_KEY')
        google_key = getattr(llm, 'google_api_key', None) or os.environ.get('GOOGLE_API_KEY')
        ollama_host = getattr(llm, 'ollama_host', None) or os.environ.get('OLLAMA_HOST', 'http://localhost:11434')

        if openai_key:
            self._providers["openai"] = OpenAIProvider(
                api_key=openai_key,
                model=getattr(llm, 'openai_model', 'gpt-4o-mini'),
            )
            logger.info("OpenAI provider registered")

        if anthropic_key:
            self._providers["anthropic"] = AnthropicProvider(
                api_key=anthropic_key,
                model=getattr(llm, 'anthropic_model', 'claude-sonnet-4-20250514'),
            )
            logger.info("Anthropic provider registered")

        if google_key:
            self._providers["gemini"] = GeminiProvider(
                api_key=google_key,
                model=getattr(llm, 'google_model', 'gemini-2.0-flash'),
            )
            logger.info("Gemini provider registered")

        # Ollama is always "available" if running
        self._providers["ollama"] = OllamaProvider(
            host=ollama_host,
            model=getattr(llm, 'ollama_model', 'llama3.2'),
        )

        if not self._providers:
            logger.warning("No LLM providers configured. Set API keys in .env or environment.")

        self._initialized = True

    # ------------------------------------------------------------------
    # Model selection
    # ------------------------------------------------------------------

    def _resolve_model(
        self,
        *,
        task_class: Optional[str] = None,
        module: Optional[str] = None,
        model: Optional[str] = None,
    ) -> tuple[str, str]:
        """
        Resolve (model_name, provider_name) using the override hierarchy.
        Returns (model, provider).
        """
        self._ensure_providers()

        # Level 1: explicit call-time override
        if model:
            provider = self._ranking.get("provider_map", {}).get(model)
            if provider:
                return model, provider
            # Guess from model name
            if "gpt" in model or "o3" in model or "o4" in model:
                return model, "openai"
            if "claude" in model:
                return model, "anthropic"
            if "gemini" in model:
                return model, "gemini"
            return model, "ollama"

        # Level 2: module override
        if module and module in self._module_overrides:
            m = self._module_overrides[module]
            p = self._ranking.get("provider_map", {}).get(m, "openai")
            return m, p

        # Level 3: task-class ranking
        if task_class:
            ranked = self._ranking.get("task_classes", {}).get(task_class, [])
            provider_map = self._ranking.get("provider_map", {})
            for candidate in ranked:
                prov = provider_map.get(candidate)
                if prov and prov in self._providers:
                    return candidate, prov

        # Level 4: global default
        default_model = self._ranking.get("default", "gpt-4o-mini")
        provider_map = self._ranking.get("provider_map", {})
        default_provider = provider_map.get(default_model, "openai")
        # Fallback to any available provider
        if default_provider not in self._providers:
            for prov_name in self._providers:
                return default_model, prov_name
        return default_model, default_provider

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def ask(
        self,
        prompt: str,
        *,
        system_prompt: Optional[str] = None,
        task_class: Optional[str] = None,
        module: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        use_cache: bool = True,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> AIResponse:
        """
        Send a prompt through the router.

        Args:
            prompt: User prompt (ignored if messages is provided).
            system_prompt: Optional system prompt.
            task_class: e.g. "classify", "code", "reason".
            module: Module name for per-module override.
            model: Explicit model name (skips ranking).
            max_tokens: Max tokens for response.
            temperature: Sampling temperature.
            use_cache: Whether to check/write cache.
            messages: Pre-built messages list (skips prompt/system_prompt).
        """
        self._ensure_providers()

        # Build messages
        if messages is None:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

        # Resolve model
        model_name, provider_name = self._resolve_model(
            task_class=task_class, module=module, model=model,
        )

        # Check budget
        settings = get_settings()
        if not self._budget.can_spend(provider_name):
            logger.warning(
                f"Budget exhausted for {provider_name}, attempting fallback"
            )
            # Try to find an alternative
            for alt_prov in self._providers:
                if self._budget.can_spend(alt_prov):
                    provider_name = alt_prov
                    # Use that provider's default model
                    provider = self._providers[provider_name]
                    break
            else:
                raise RuntimeError("All providers have exceeded daily budget")

        # Check cache
        if use_cache:
            cache_key = self._make_cache_key(messages, model_name)
            cached = self._cache.get(cache_key)
            if cached is not None:
                cached.cached = True
                logger.debug(f"Cache hit for model={model_name}")
                return cached

        # Get provider and set model
        provider = self._providers[provider_name]
        # Create a new provider instance with the right model if needed
        if hasattr(provider, "model") and provider.model != model_name:
            provider = self._create_provider_for_model(provider_name, model_name)

        # Call provider
        response = await provider.generate(
            messages=messages,
            max_tokens=max_tokens or settings.llm.max_tokens,
            temperature=temperature,
        )
        response.model = model_name
        response.provider = provider_name

        # Track budget
        self._budget.record(
            provider=provider_name,
            model=model_name,
            input_tokens=response.usage.get("input_tokens", response.usage.get("prompt_tokens", 0)),
            output_tokens=response.usage.get("output_tokens", response.usage.get("completion_tokens", 0)),
        )

        # Write cache
        if use_cache:
            cache_key = self._make_cache_key(messages, model_name)
            self._cache.set(cache_key, response)

        return response

    async def stream(
        self,
        prompt: str,
        *,
        system_prompt: Optional[str] = None,
        task_class: Optional[str] = None,
        module: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
        messages: Optional[List[Dict[str, str]]] = None,
    ):
        """Stream a response. Same routing logic as ask()."""
        self._ensure_providers()

        if messages is None:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

        model_name, provider_name = self._resolve_model(
            task_class=task_class, module=module, model=model,
        )

        provider = self._providers[provider_name]
        if hasattr(provider, "model") and provider.model != model_name:
            provider = self._create_provider_for_model(provider_name, model_name)

        settings = get_settings()
        async for chunk in provider.stream(
            messages=messages,
            max_tokens=max_tokens or settings.llm.max_tokens,
            temperature=temperature,
        ):
            yield chunk

        # Approximate budget tracking for streaming
        self._budget.record(
            provider=provider_name,
            model=model_name,
            input_tokens=0,
            output_tokens=0,
        )

    # ------------------------------------------------------------------
    # Module overrides
    # ------------------------------------------------------------------

    def set_module_model(self, module: str, model: str):
        """Override the model for a specific module."""
        self._module_overrides[module] = model

    def clear_module_override(self, module: str):
        """Remove a module-level override."""
        self._module_overrides.pop(module, None)

    # ------------------------------------------------------------------
    # Info
    # ------------------------------------------------------------------

    def list_available_models(self) -> List[Dict[str, Any]]:
        """List all available models grouped by provider."""
        self._ensure_providers()
        result = []
        for prov_name, provider in self._providers.items():
            result.append({
                "provider": prov_name,
                "model": getattr(provider, "model", "unknown"),
            })
        return result

    def get_task_classes(self) -> Dict[str, List[str]]:
        """Return the full task-class ranking."""
        return self._ranking.get("task_classes", {})

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _create_provider_for_model(self, provider_name: str, model: str) -> AIProvider:
        """Create a new provider instance for a specific model."""
        import os
        settings = get_settings()
        llm = settings.llm
        if provider_name == "openai":
            key = getattr(llm, 'openai_api_key', None) or os.environ.get('OPENAI_API_KEY')
            return OpenAIProvider(api_key=key, model=model)
        elif provider_name == "anthropic":
            key = getattr(llm, 'anthropic_api_key', None) or os.environ.get('ANTHROPIC_API_KEY')
            return AnthropicProvider(api_key=key, model=model)
        elif provider_name == "gemini":
            key = getattr(llm, 'google_api_key', None) or os.environ.get('GOOGLE_API_KEY')
            return GeminiProvider(api_key=key, model=model)
        elif provider_name == "ollama":
            host = getattr(llm, 'ollama_host', None) or os.environ.get('OLLAMA_HOST', 'http://localhost:11434')
            return OllamaProvider(host=host, model=model)
        raise ValueError(f"Unknown provider: {provider_name}")

    @staticmethod
    def _make_cache_key(messages: List[Dict[str, str]], model: str) -> str:
        """Content-hash cache key."""
        content = model + "|" + "|".join(
            m.get("role", "") + ":" + m.get("content", "") for m in messages
        )
        return hashlib.sha256(content.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_router: Optional[LLMRouter] = None


def get_router() -> LLMRouter:
    """Return the global LLMRouter singleton."""
    global _router
    if _router is None:
        _router = LLMRouter()
    return _router


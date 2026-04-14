"""
LLM Client Factory
Unified interface for Ollama, OpenAI, and local models.
"""
import os
import re
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Generator
import logging

logger = logging.getLogger(__name__)


class LLMClient(ABC):
    """Abstract base class for LLM clients."""

    @abstractmethod
    def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Any:
        """Send a chat request to the LLM."""
        pass

    @abstractmethod
    async def achat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        """Async version of chat."""
        pass


class OllamaClient(LLMClient):
    """Ollama local LLM client."""

    def __init__(
        self,
        host: Optional[str] = None,
        default_model: Optional[str] = None
    ):
        import ollama
        self.ollama = ollama
        self.host = host or os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.default_model = default_model or os.getenv("OLLAMA_MODEL", "llama3.1:8b")

    def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Any:
        model = model or self.default_model
        try:
            response = self.ollama.chat(
                model=model,
                messages=messages,
                stream=stream,
                **kwargs
            )
            return response
        except Exception as e:
            logger.error(f"Ollama chat error: {e}")
            raise

    def achat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        """Async chat using Ollama's async client."""
        import asyncio
        model = model or self.default_model

        async def _chat():
            async for part in await self.ollama.astream(model=model, messages=messages, **kwargs):
                yield part.message.content
        # For now, use sync version wrapped
        return self.chat(messages, model, **kwargs)['message']['content']


class OpenAIClient(LLMClient):
    """OpenAI API client."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: str = "gpt-4"
    ):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.default_model = default_model

    def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Any:
        model = model or self.default_model
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=stream,
                **kwargs
            )
            return response
        except Exception as e:
            logger.error(f"OpenAI chat error: {e}")
            raise

    def achat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        """Async chat using OpenAI's async client."""
        import asyncio
        model = model or self.default_model
        response = self.chat(messages, model, **kwargs)
        return response.choices[0].message.content


class LLMFactory:
    """Factory for creating LLM client instances."""

    _clients: Dict[str, LLMClient] = {}

    @classmethod
    def get_client(
        cls,
        provider: str,
        **kwargs
    ) -> LLMClient:
        """
        Get or create an LLM client.

        Args:
            provider: One of 'ollama', 'openai'
            **kwargs: Additional arguments for the client

        Returns:
            LLMClient instance
        """
        if provider == "ollama":
            if "ollama" not in cls._clients:
                cls._clients["ollama"] = OllamaClient(**kwargs)
            return cls._clients["ollama"]

        elif provider == "openai":
            if "openai" not in cls._clients:
                cls._clients["openai"] = OpenAIClient(**kwargs)
            return cls._clients["openai"]

        else:
            raise ValueError(f"Unknown LLM provider: {provider}")

    @classmethod
    def reset(cls):
        """Reset all cached clients (useful for testing)."""
        cls._clients.clear()


def chat_with_model(
    provider: str,
    prompt: str,
    system_prompt: Optional[str] = None,
    model: Optional[str] = None,
    **kwargs
) -> str:
    """
    Simple helper for a single chat interaction.

    Args:
        provider: 'ollama' or 'openai'
        prompt: User prompt
        system_prompt: Optional system prompt
        model: Model name (uses default if not specified)
        **kwargs: Additional arguments for the client

    Returns:
        Response text
    """
    client = LLMFactory.get_client(provider)

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    if provider == "openai":
        response = client.chat(messages, model=model, **kwargs)
        return response.choices[0].message.content
    else:  # ollama
        response = client.chat(messages, model=model, **kwargs)
        return response['message']['content']

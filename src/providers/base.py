"""
AI Provider Base Classes
========================
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, AsyncIterator
from dataclasses import dataclass

@dataclass
class AIResponse:
    """Standardized AI response."""
    content: str
    raw_response: Any
    model: str
    usage: Dict[str, int]
    finish_reason: str

class AIProvider(ABC):
    """Abstract base class for AI providers."""
    
    @abstractmethod
    async def generate(self, prompt: str, 
                      system_prompt: str = None,
                      **kwargs) -> AIResponse:
        """Generate text from prompt."""
        pass
    
    @abstractmethod
    async def stream(self, prompt: str,
                    system_prompt: str = None,
                    **kwargs) -> AsyncIterator[str]:
        """Stream text generation."""
        pass
    
    def format_messages(self, prompt: str, 
                       system_prompt: str = None,
                       history: List[Dict] = None) -> List[Dict]:
        """Format messages for the provider."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": prompt})
        return messages

class AIProviderFactory:
    """Factory for creating AI providers."""
    
    _providers = {}
    
    @classmethod
    def register(cls, name: str, provider_class: type):
        """Register a provider class."""
        cls._providers[name] = provider_class
    
    @classmethod
    def create(cls, provider_name: str, **kwargs) -> AIProvider:
        """Create a provider instance."""
        if provider_name not in cls._providers:
            raise ValueError(f"Unknown provider: {provider_name}. Available: {list(cls._providers.keys())}")
        return cls._providers[provider_name](**kwargs)
    
    @classmethod
    def available_providers(cls) -> List[str]:
        """List available providers."""
        return list(cls._providers.keys())

# Register built-in providers
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .ollama_provider import OllamaProvider

AIProviderFactory.register("openai", OpenAIProvider)
AIProviderFactory.register("anthropic", AnthropicProvider)
AIProviderFactory.register("ollama", OllamaProvider)

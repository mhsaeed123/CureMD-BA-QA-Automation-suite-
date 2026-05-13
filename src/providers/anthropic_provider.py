"""Anthropic Provider Implementation"""
import os
from typing import AsyncIterator
from providers.base import AIProvider, AIResponse, AIProviderFactory

class AnthropicProvider(AIProvider):
    """Anthropic Claude provider."""
    
    def __init__(self, api_key: str = None, model: str = "claude-3-sonnet-20240229", **kwargs):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.model = model
        self.client = None
    
    def _get_client(self):
        if self.client is None:
            try:
                from anthropic import AsyncAnthropic
                self.client = AsyncAnthropic(api_key=self.api_key)
            except ImportError:
                raise ImportError("Anthropic package not installed. Run: pip install anthropic")
        return self.client
    
    async def generate(self, prompt: str, system_prompt: str = None, **kwargs) -> AIResponse:
        client = self._get_client()
        
        response = await client.messages.create(
            model=self.model,
            max_tokens=kwargs.get("max_tokens", 4096),
            system=system_prompt or "",
            messages=[{"role": "user", "content": prompt}]
        )
        
        return AIResponse(
            content=response.content[0].text,
            raw_response=response,
            model=self.model,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            },
            finish_reason=response.stop_reason
        )
    
    async def stream(self, prompt: str, system_prompt: str = None, **kwargs) -> AsyncIterator[str]:
        client = self._get_client()
        
        async with client.messages.stream(
            model=self.model,
            max_tokens=kwargs.get("max_tokens", 4096),
            system=system_prompt or "",
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            async for text in stream.text_stream:
                yield text

AIProviderFactory.register("anthropic", AnthropicProvider)

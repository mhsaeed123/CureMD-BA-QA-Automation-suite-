"""OpenAI Provider Implementation"""
import os
from typing import AsyncIterator
from .base import AIProvider, AIResponse, AIProviderFactory

class OpenAIProvider(AIProvider):
    """OpenAI GPT provider."""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4", **kwargs):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
    
    def _get_client(self):
        if self.client is None:
            try:
                import openai
                self.client = openai.OpenAI(api_key=self.api_key)
            except ImportError:
                raise ImportError("OpenAI package not installed. Run: pip install openai")
        return self.client
    
    async def generate(self, prompt: str, system_prompt: str = None, **kwargs) -> AIResponse:
        messages = self.format_messages(prompt, system_prompt)
        client = self._get_client()
        
        response = client.chat.completions.create(
            model=self.model,
            messages=messages,
            **kwargs
        )
        
        return AIResponse(
            content=response.choices[0].message.content,
            raw_response=response,
            model=self.model,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            finish_reason=response.choices[0].finish_reason
        )
    
    async def stream(self, prompt: str, system_prompt: str = None, **kwargs) -> AsyncIterator[str]:
        messages = self.format_messages(prompt, system_prompt)
        client = self._get_client()
        
        stream = client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
            **kwargs
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

AIProviderFactory.register("openai", OpenAIProvider)

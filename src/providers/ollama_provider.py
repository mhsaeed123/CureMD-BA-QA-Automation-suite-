"""Ollama Provider Implementation"""
import os
from typing import AsyncIterator
from .base import AIProvider, AIResponse, AIProviderFactory

class OllamaProvider(AIProvider):
    """Ollama local LLM provider."""
    
    def __init__(self, model: str = "llama2", host: str = None, **kwargs):
        self.model = model
        self.host = host or os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.client = None
    
    def _get_client(self):
        if self.client is None:
            try:
                import ollama
                self.client = ollama
            except ImportError:
                raise ImportError("Ollama package not installed. Run: pip install ollama")
        return self.client
    
    async def generate(self, prompt: str, system_prompt: str = None, **kwargs) -> AIResponse:
        client = self._get_client()
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = client.chat(model=self.model, messages=messages)
        
        return AIResponse(
            content=response['message']['content'],
            raw_response=response,
            model=self.model,
            usage={},
            finish_reason="stop"
        )
    
    async def stream(self, prompt: str, system_prompt: str = None, **kwargs) -> AsyncIterator[str]:
        client = self._get_client()
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        stream = client.chat(model=self.model, messages=messages, stream=True)
        
        for chunk in stream:
            if chunk['message']['content']:
                yield chunk['message']['content']

AIProviderFactory.register("ollama", OllamaProvider)

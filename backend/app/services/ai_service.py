from abc import ABC, abstractmethod
from typing import List, Dict, Any
import openai
import ollama
import os

class AIProvider(ABC):
    @abstractmethod
    def generate_text(self, prompt: str, system_prompt: str = None) -> str:
        pass

class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model

    def generate_text(self, prompt: str, system_prompt: str = None) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        return response.choices[0].message.content

class OllamaProvider(AIProvider):
    def __init__(self, model: str = "llama2"):
        self.model = model
        self.host = os.getenv("OLLAMA_HOST", "http://localhost:11434")

    def generate_text(self, prompt: str, system_prompt: str = None) -> str:
        # Note: Ollama python client handles connection automatically if env var is set
        # But we can explicit pass it if needed.
        # For simple usage:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = ollama.chat(model=self.model, messages=messages)
        return response['message']['content']

class AIProviderFactory:
    @staticmethod
    def get_provider(provider_type: str, config: Dict[str, Any]) -> AIProvider:
        if provider_type == "openai":
            return OpenAIProvider(api_key=config.get("api_key"), model=config.get("model", "gpt-4"))
        elif provider_type == "ollama":
            return OllamaProvider(model=config.get("model", "llama2"))
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")

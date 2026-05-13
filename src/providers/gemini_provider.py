"""
Gemini Provider
===============
Supports Google Gemini models via the generative AI SDK.
"""

from typing import AsyncIterator, Dict, List, Optional

from providers.base import AIProvider, AIResponse


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash", **kwargs):
        super().__init__(**kwargs)
        self.api_key = api_key
        self.model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self._client = genai
        return self._client

    async def generate(
        self,
        messages: List[Dict[str, str]],
        *,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs,
    ) -> AIResponse:
        import google.generativeai as genai

        client = self._get_client()
        # Build Gemini-format history
        system_instruction = None
        contents = []
        for m in messages:
            if m["role"] == "system":
                system_instruction = m["content"]
            elif m["role"] == "user":
                contents.append({"role": "user", "parts": [m["content"]]})
            elif m["role"] == "assistant":
                contents.append({"role": "model", "parts": [m["content"]]})

        model = client.GenerativeModel(
            self.model,
            system_instruction=system_instruction,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
        )
        response = await model.generate_content_async(contents)
        return AIResponse(
            content=response.text,
            model=self.model,
            provider=self.name,
            usage={
                "input_tokens": response.usage_metadata.prompt_token_count or 0,
                "output_tokens": response.usage_metadata.candidates_token_count or 0,
                "total_tokens": response.usage_metadata.total_token_count or 0,
            },
            raw_response=response,
            finish_reason="stop",
        )

    async def stream(
        self,
        messages: List[Dict[str, str]],
        *,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs,
    ) -> AsyncIterator[str]:
        import google.generativeai as genai

        client = self._get_client()
        system_instruction = None
        contents = []
        for m in messages:
            if m["role"] == "system":
                system_instruction = m["content"]
            elif m["role"] == "user":
                contents.append({"role": "user", "parts": [m["content"]]})
            elif m["role"] == "assistant":
                contents.append({"role": "model", "parts": [m["content"]]})

        model = client.GenerativeModel(
            self.model,
            system_instruction=system_instruction,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
        )
        response = await model.generate_content_async(contents, stream=True)
        async for chunk in response:
            if chunk.text:
                yield chunk.text

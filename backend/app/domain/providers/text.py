from typing import Any, Protocol

import httpx

from app.config import get_settings

settings = get_settings()


class TextCompletionProvider(Protocol):
    def complete_json(self, messages: list[dict[str, str]]) -> dict[str, Any]: ...


class OpenRouterProvider:
    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    def complete_json(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        if not self.api_key:
            return {}
        response = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.model,
                "messages": messages,
                "response_format": {"type": "json_object"},
            },
            timeout=60.0,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        import json

        return json.loads(content)


class MockTextProvider:
    def complete_json(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        if "candidates" in messages[0]["content"]:
            return {
                "candidates": [
                    {
                        "term": "practice",
                        "translation_pl": "ćwiczyć",
                        "context": "Let's practice together.",
                        "flag_reason": "",
                    }
                ]
            }
        return {"summary": "Practiced greetings.", "facts": ["User enjoys travel topics."]}


def get_text_provider() -> TextCompletionProvider:
    if settings.openrouter_api_key:
        return OpenRouterProvider(settings.openrouter_api_key, settings.text_model)
    return MockTextProvider()

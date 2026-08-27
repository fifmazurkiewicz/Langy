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
        if "mnemonic" in messages[0]["content"].lower() and "association" in messages[0]["content"].lower():
            term = "word"
            if len(messages) > 1 and "term" in messages[1]["content"]:
                term = messages[1]["content"].split(":", 1)[-1].strip()
            return {
                "association_pl": f"Wyobraź sobie '{term}' jako zabawne skojarzenie dźwiękowe.",
                "example_l2": f"I love using {term} every day.",
                "example_pl": "Uwielbiam używać tego słowa każdego dnia.",
            }
        if "shadowing" in messages[0]["content"].lower() or "dialogue" in messages[0]["content"].lower():
            return {
                "lines": [
                    {"role": "agent", "text": "Welcome to our practice."},
                    {"role": "user", "text": "Thanks!"},
                    {"role": "agent", "text": "Let's begin."},
                    {"role": "user", "text": "OK."},
                ]
            }
        if "Compare learner" in messages[0]["content"]:
            return {"ok": True, "corrected_text": None, "explanation_pl": None, "mark_hard": False}
        if "turn_correction" in messages[0]["content"] or "substantive" in messages[0]["content"].lower():
            text = messages[1]["content"]
            if "I go shop" in text:
                return {
                    "is_corrected": True,
                    "corrected_text": "I go to the shop",
                    "explanation_pl": "Brakuje przyimka 'to'.",
                    "mistake_type": "Grammar",
                }
            return {
                "is_corrected": False,
                "corrected_text": None,
                "explanation_pl": None,
                "mistake_type": None,
            }
        if "translation_pl" in messages[0]["content"] or "flashcard" in messages[0]["content"].lower():
            span = messages[1]["content"].split(":", 1)[-1].strip() if len(messages) > 1 else "word"
            return {
                "translation_pl": "przykład",
                "example_l2": f"I used {span} in a sentence.",
                "example_pl": "Użyłem tego w zdaniu.",
                "context_sentence": f"Example with {span}.",
            }
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

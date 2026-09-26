from __future__ import annotations

import hashlib
import time
from typing import Any

import httpx

from app.config import get_settings

MODEL = "typesafe/jev-1.13"
URL = "https://openrouter.ai/api/alpha/decisions"


def correction_decision(text: str, language: str) -> dict[str, Any] | None:
    """Return an optional, typed preflight decision; failure stays fail-open."""
    key = get_settings().openrouter_api_key
    if not key:
        return None
    payload = {
        "model": MODEL,
        "state": {"utterance": text, "target_language": language},
        "questions": {
            "needs_substantive_correction": {
                "type": "noul",
                "instructions": "Does the learner utterance contain a substantive language error? Ignore punctuation, capitalization, and whitespace-only differences.",
            },
            "mistake_category": {
                "type": "choice",
                "instructions": "What is the primary substantive error category if one exists?",
                "criteria": {
                    "grammar": "Grammar, agreement, tense, or inflection.",
                    "vocabulary": "Incorrect or unnatural word choice.",
                    "word_order": "Incorrect word order or sentence structure.",
                    "pronunciation_or_transcription": "Likely speech-recognition or pronunciation error.",
                    "other": "A substantive error outside these categories.",
                    "none": "No substantive error.",
                },
            },
        },
    }
    for attempt in range(3):
        try:
            response = httpx.post(URL, headers={"Authorization": f"Bearer {key}"}, json=payload, timeout=5)
            if response.status_code == 429 or response.status_code >= 500:
                if attempt < 2:
                    time.sleep(0.25 * (attempt + 1))
                    continue
                return None
            response.raise_for_status()
            answers = response.json()["answers"]
            needs = answers["needs_substantive_correction"]
            category = answers["mistake_category"]
            if not isinstance(needs.get("noul"), (int, float)) or not isinstance(category.get("confidence"), (int, float)):
                return None
            return {"needs": float(needs["noul"]), "category": category.get("choice"), "confidence": float(category["confidence"]), "state_sha256": hashlib.sha256(text.encode()).hexdigest()}
        except (httpx.HTTPError, KeyError, TypeError, ValueError):
            return None
    return None


def turn_completion_decision(text: str, language: str) -> dict[str, Any] | None:
    """Conservative decision for a paused Web Speech turn; failures stay neutral."""
    key = get_settings().openrouter_api_key
    if not key:
        return None
    payload = {
        "model": MODEL,
        "state": {"utterance": text, "target_language": language},
        "questions": {
            "likely_complete": {
                "type": "noul",
                "instructions": (
                    "Is this likely a complete conversational turn? Return low probability for fillers, "
                    "obvious mid-sentence pauses, or an unfinished self-repair. A short but complete answer is valid."
                ),
            }
        },
    }
    try:
        response = httpx.post(URL, headers={"Authorization": f"Bearer {key}"}, json=payload, timeout=1.5)
        response.raise_for_status()
        answer = response.json()["answers"]["likely_complete"]
        probability = answer.get("noul")
        if not isinstance(probability, (int, float)):
            return None
        return {"likely_complete": float(probability) >= 0.80, "confidence": float(probability)}
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None

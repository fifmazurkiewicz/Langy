from unittest.mock import MagicMock, patch

import pytest

from app.domain.voice.live_session import build_live_system_instruction
from app.domain.voice.live_token import LiveTokenError, mint_ephemeral_live_token


def test_build_live_system_instruction_includes_language():
    agenda = {
        "language": "en-GB",
        "profile": {"motivations": ["travel"], "skills": {"speaking": 2}},
        "memory_facts": ["Likes hiking"],
        "study_plan": {"cefr_level": "A2", "progress_day": 3, "current_topic": "Travel"},
    }
    text = build_live_system_instruction(agenda)
    assert "en-GB" in text
    assert "travel" in text
    assert "A2" in text


def test_build_live_system_instruction_includes_listening_space_rules():
    agenda = {
        "language": "en-GB",
        "profile": {"motivations": ["travel"], "skills": {}},
        "memory_facts": [],
        "study_plan": None,
    }
    text = build_live_system_instruction(agenda).lower()
    assert "react" in text or "intention" in text or "intent" in text
    assert "one" in text and ("question" in text or "invite" in text or "invitation" in text)
    assert "multiple questions" in text or "do not ask more than one" in text or "at most one" in text


def test_build_live_system_instruction_claims_audible_voice():
    agenda = {
        "language": "en-GB",
        "profile": {"motivations": [], "skills": {}},
        "memory_facts": [],
        "study_plan": None,
    }
    text = build_live_system_instruction(agenda).lower()
    assert "voice" in text or "audio" in text
    assert "never say you have no voice" in text or "do not claim you are text-only" in text


def test_build_live_system_instruction_includes_soft_brevity():
    agenda = {
        "language": "en-GB",
        "profile": {"motivations": [], "skills": {}},
        "memory_facts": [],
        "study_plan": None,
    }
    text = build_live_system_instruction(agenda).lower()
    assert "short" in text
    assert "expand" in text


def test_build_live_system_instruction_allows_exercises():
    agenda = {
        "language": "en-GB",
        "profile": {"motivations": [], "skills": {}},
        "memory_facts": [],
        "study_plan": None,
    }
    text = build_live_system_instruction(agenda).lower()
    assert "exercise" in text
    assert "repetition" in text or "repeat" in text
    assert "must" in text
    assert "never refuse" in text or "do not refuse" in text
    assert "conversational" in text or "free conversation" in text or "free-flowing" in text
    assert "wait" in text and "repeat" in text


def test_build_live_system_instruction_exercise_overrides_open_chat_steer():
    agenda = {
        "language": "en-GB",
        "profile": {"motivations": [], "skills": {}},
        "memory_facts": [],
        "study_plan": None,
    }
    text = build_live_system_instruction(agenda).lower()
    assert "exercise" in text
    assert "instead of" in text or "do not steer" in text or "not steer" in text


def test_mint_token_requires_api_key():
    with pytest.raises(LiveTokenError):
        mint_ephemeral_live_token(system_instruction="Hi", api_key="")


def test_mint_token_success():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"name": "auth_tokens/abc", "expireTime": "2026-01-01T00:00:00Z"}

    with patch("app.domain.voice.live_token.httpx.post", return_value=mock_response) as post:
        result = mint_ephemeral_live_token(system_instruction="Practice English", api_key="test-key")
        assert result["token"] == "auth_tokens/abc"
        assert post.called

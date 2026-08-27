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

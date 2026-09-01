from unittest.mock import MagicMock, patch

from app.domain.chat.text_turn import text_user_turn


class FakeUser:
    id = "00000000-0000-4000-8000-000000000001"
    spend_cap_usd = 10


class FakeConversation:
    language = "en-GB"
    transcript = "Agent: Hello!\nUser: I want grammar practice."


class FakeProvider:
    def complete_json(self, messages):
        return {"reply": "Let's practice present perfect together."}


def test_text_turn_uses_provider_reply():
    db = MagicMock()
    with patch("app.domain.chat.text_turn.build_agenda") as mock_agenda:
        mock_agenda.return_value = {"language": "en-GB", "profile": {}}
        reply = text_user_turn(
            db,
            FakeUser(),
            FakeConversation(),
            "I want grammar practice.",
            provider=FakeProvider(),
        )
    assert reply == "Let's practice present perfect together."


def test_text_turn_without_provider_returns_fallback():
    db = MagicMock()
    with patch("app.domain.chat.text_turn.build_agenda") as mock_agenda:
        mock_agenda.return_value = {"language": "en-GB", "profile": {}}
        reply = text_user_turn(db, FakeUser(), FakeConversation(), "hello", provider=None)
    assert "trouble responding" in reply.lower()

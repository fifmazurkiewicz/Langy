from app.domain.chat.transcript import parse_transcript, preview_transcript


def test_parse_transcript_empty():
    assert parse_transcript("") == []
    assert parse_transcript(None) == []


def test_parse_transcript_roles():
    raw = "Agent: Hello\nUser: Hi there\nAgent: How are you?"
    assert parse_transcript(raw) == [
        {"role": "Agent", "text": "Hello"},
        {"role": "User", "text": "Hi there"},
        {"role": "Agent", "text": "How are you?"},
    ]


def test_preview_transcript_truncates():
    long = "A" * 150
    assert len(preview_transcript(long)) == 120
    assert preview_transcript(long).endswith("…")

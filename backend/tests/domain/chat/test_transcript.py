from app.domain.chat.transcript import parse_transcript, preview_transcript, snippet_lines


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


def test_snippet_lines_returns_last_n():
    lines = "\n".join(f"Agent: line {i}" for i in range(15))
    snip = snippet_lines(lines, limit=10)
    assert len(snip) == 10
    assert snip[0] == {"role": "Agent", "text": "line 5"}
    assert snip[-1] == {"role": "Agent", "text": "line 14"}


def test_snippet_lines_empty_and_short():
    assert snippet_lines(None) == []
    assert snippet_lines("") == []
    short = "User: Hi\nAgent: Hello"
    assert snippet_lines(short, limit=10) == [
        {"role": "User", "text": "Hi"},
        {"role": "Agent", "text": "Hello"},
    ]

from app.domain.agenda.service import OPENING_LINES, RESUME_LINES

FORBIDDEN_MARKERS = ("shall we practice?", "what's on your mind for today's practice?")


def test_opening_lines_invite_space_not_interview():
    assert len(OPENING_LINES) >= 3
    joined = " ".join(OPENING_LINES).lower()
    for marker in FORBIDDEN_MARKERS:
        assert marker not in joined
    # Spacious invitations: prefer offer/space wording over quiz tone
    assert any(
        any(word in line.lower() for word in ("whenever", "take your time", "i'm listening", "go ahead", "happy to listen", "what would you like"))
        for line in OPENING_LINES
    )


def test_resume_lines_invite_space():
    assert len(RESUME_LINES) >= 3
    joined = " ".join(RESUME_LINES).lower()
    assert "shall we pick up where we left off?" not in joined

### Task 1: Failing tests for listening-space instruction + opening pool

**Files:**
- Modify: `backend/tests/domain/voice/test_live_token.py`
- Create: `backend/tests/domain/agenda/test_opening_lines.py`
- Test: same

**Interfaces:**
- Consumes: `build_live_system_instruction(agenda: dict) -> str` from `app.domain.voice.live_session`
- Consumes: `OPENING_LINES`, `RESUME_LINES` from `app.domain.agenda.service`
- Produces: failing tests that lock the listening-space contract

- [ ] **Step 1: Extend live instruction test (failing)**

Add to `backend/tests/domain/voice/test_live_token.py`:

```python
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
```

- [ ] **Step 2: Create opening-lines test (failing until pool rewrite if needed)**

Create `backend/tests/domain/agenda/test_opening_lines.py`:

```python
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
```

- [ ] **Step 3: Run tests â€” expect FAIL**

Run:

```bash
cd backend && python -m pytest tests/domain/voice/test_live_token.py::test_build_live_system_instruction_includes_listening_space_rules tests/domain/agenda/test_opening_lines.py -v
```

Expected: FAIL (missing listening rules in instruction; old opening/resume strings still present).

- [ ] **Step 4: Commit (only if user asked for commits)**

```bash
git add backend/tests/domain/voice/test_live_token.py backend/tests/domain/agenda/test_opening_lines.py
git commit -m "test: lock tutor listening-space prompt and opening pool"
```

---

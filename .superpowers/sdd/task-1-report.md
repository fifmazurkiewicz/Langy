# Task 1 Report: Failing tests for listening-space instruction + opening pool

**Branch:** `fix/tutor-listening-space`  
**Date:** 2026-09-03  
**Status:** DONE (TDD RED confirmed)

## Summary

Added three failing tests that lock the tutor listening-space contract:
1. Live system instruction must include listening-space rules (react/intent, one question/invite, no multiple questions).
2. Opening lines pool must avoid interview tone and include spacious invitations.
3. Resume lines pool must avoid "shall we pick up where we left off?".

No production code was changed (Task 2 scope).

## Files changed

| Action | Path |
|--------|------|
| Modified | `backend/tests/domain/voice/test_live_token.py` |
| Created | `backend/tests/domain/agenda/test_opening_lines.py` |

## Test code added

### `test_live_token.py`

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

### `test_opening_lines.py`

```python
from app.domain.agenda.service import OPENING_LINES, RESUME_LINES

FORBIDDEN_MARKERS = ("shall we practice?", "what's on your mind for today's practice?")


def test_opening_lines_invite_space_not_interview():
    assert len(OPENING_LINES) >= 3
    joined = " ".join(OPENING_LINES).lower()
    for marker in FORBIDDEN_MARKERS:
        assert marker not in joined
    assert any(
        any(word in line.lower() for word in ("whenever", "take your time", "i'm listening", "go ahead", "happy to listen", "what would you like"))
        for line in OPENING_LINES
    )


def test_resume_lines_invite_space():
    assert len(RESUME_LINES) >= 3
    joined = " ".join(RESUME_LINES).lower()
    assert "shall we pick up where we left off?" not in joined
```

## TDD RED evidence

**Command:**

```bash
cd backend && python -m pytest tests/domain/voice/test_live_token.py::test_build_live_system_instruction_includes_listening_space_rules tests/domain/agenda/test_opening_lines.py -v
```

**Result:** 3 failed (expected)

```
tests/domain/voice/test_live_token.py::test_build_live_system_instruction_includes_listening_space_rules FAILED [ 33%]
tests/domain/agenda/test_opening_lines.py::test_opening_lines_invite_space_not_interview FAILED [ 66%]
tests/domain/agenda/test_opening_lines.py::test_resume_lines_invite_space FAILED [100%]
```

### Failure details

1. **`test_build_live_system_instruction_includes_listening_space_rules`** — first assertion fails: current instruction lacks `react` / `intention` / `intent`. Existing text ends with generic opening guidance only.

2. **`test_opening_lines_invite_space_not_interview`** — forbidden marker `shall we practice?` still present in `OPENING_LINES` (line: "What are you learning right now — shall we practice?").

3. **`test_resume_lines_invite_space`** — forbidden phrase `shall we pick up where we left off?` still present in `RESUME_LINES` (line: "Welcome back! Shall we pick up where we left off?").

## Self-review

- Test code matches brief verbatim (paths, imports, assertions).
- Only test files touched; no production changes.
- All three tests fail for the reasons predicted in the plan (missing listening rules; old opening/resume strings).
- Commit skipped per user instruction.

## Next step (Task 2)

Implement production changes in:
- `backend/app/domain/voice/live_session.py` — add listening-space rules to `build_live_system_instruction`.
- `backend/app/domain/agenda/service.py` — rewrite `OPENING_LINES` and `RESUME_LINES` pools.

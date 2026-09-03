# Task 2 Report: System instruction + softer opening/resume lines

**Status:** GREEN  
**Branch:** `fix/tutor-listening-space`  
**Date:** 2026-09-03

## Summary

Implemented listening-space turn-taking rules in `build_live_system_instruction` and replaced opening/resume line pools with softer, space-giving invitations. Production-only changes; no test file edits.

## RED (Task 1)

Task 1 added failing tests in:
- `backend/tests/domain/voice/test_live_token.py` — `test_build_live_system_instruction_includes_listening_space_rules`
- `backend/tests/domain/agenda/test_opening_lines.py` — `test_opening_lines_invite_space_not_interview`, `test_resume_lines_invite_space`

RED was confirmed in Task 1 before this implementation.

## Changes

### `backend/app/domain/voice/live_session.py`

Replaced the single opening-only line with turn-taking rules per brief:

- React to learner intention / last message
- Develop topic with statements over questions
- **At most one** open invitation; never multiple questions per turn
- Opening: invite talk/practice; no interest listing unless silent/unsure
- Preserved motivations, optional study plan, skills, memory facts blocks

### `backend/app/domain/agenda/service.py` (OPENING_LINES / RESUME_LINES only)

**OPENING_LINES:**
1. "I'm listening — what would you like to talk about today?"
2. "Take your time — whenever you're ready, tell me what you'd like to practice."
3. "Happy to listen. Go ahead whenever you want to start."

**RESUME_LINES:**
1. "Welcome back — I'm listening whenever you're ready to continue."
2. "Good to see you again. Take your time; we can pick up whenever you like."
3. "I'm here. Go ahead when you want to continue."

Removed forbidden markers: `shall we practice?`, `what's on your mind for today's practice?`, `shall we pick up where we left off?`.

## TDD GREEN evidence

```bash
cd backend; python -m pytest tests/domain/voice/test_live_token.py tests/domain/agenda/test_opening_lines.py -v
```

```
tests/domain/voice/test_live_token.py::test_build_live_system_instruction_includes_language PASSED
tests/domain/voice/test_live_token.py::test_build_live_system_instruction_includes_listening_space_rules PASSED
tests/domain/voice/test_live_token.py::test_mint_token_requires_api_key PASSED
tests/domain/voice/test_live_token.py::test_mint_token_success PASSED
tests/domain/agenda/test_opening_lines.py::test_opening_lines_invite_space_not_interview PASSED
tests/domain/agenda/test_opening_lines.py::test_resume_lines_invite_space PASSED

============================== 6 passed in 0.73s ==============================
```

## Isolation

Only modified:
- `backend/app/domain/voice/live_session.py`
- `backend/app/domain/agenda/service.py` (OPENING_LINES / RESUME_LINES)

Unrelated dirty files (shadowing, chat transcript, UX) were not touched.

## Commits

None — user forbids commits unless explicitly requested.

## Concerns

None. All Task 1 assertions satisfied; existing language/travel/A2 test still passes.

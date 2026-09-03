### Task 2: Implement system instruction + softer opening/resume lines

**Files:**
- Modify: `backend/app/domain/voice/live_session.py`
- Modify: `backend/app/domain/agenda/service.py` (OPENING_LINES / RESUME_LINES only)
- Test: Task 1 tests

**Interfaces:**
- Consumes: agenda dict shape unchanged
- Produces: `build_live_system_instruction` string with listening-space rules; new line pools

- [ ] **Step 1: Update `build_live_system_instruction`**

In `backend/app/domain/voice/live_session.py`, replace the opening-only line with turn-taking rules. Keep motivations / plan / skills / facts. Target `parts` list:

```python
parts = [
    "You are Langy, a friendly language tutor. The learner's native language is Polish; speak in the target language unless they ask for Polish.",
    f"Target language session: {agenda.get('language')}.",
    f"Motivations: {', '.join(profile.get('motivations') or []) or 'general practice'}.",
    "Turn-taking (every turn, including opening): (1) briefly react to the learner's intention or last message; "
    "(2) develop the topic with comments or examples â€” prefer statements over questions; "
    "(3) at most one open invitation to continue speaking. Never ask multiple questions in one turn. Give the learner space to speak.",
    "Opening: invite them to talk or practice; do not list their interests unless they are silent or unsure.",
    "When the user asks to save a word, acknowledge you will save it.",
]
```

Exact substrings must satisfy Task 1 asserts (`react`/`intention`/`intent`, `one` + question/invite, and `at most one` or equivalent multi-question ban). Prefer keeping the phrase **`at most one`** so the test stays stable.

- [ ] **Step 2: Soften opening and resume pools**

In `backend/app/domain/agenda/service.py`:

```python
OPENING_LINES = [
    "I'm listening â€” what would you like to talk about today?",
    "Take your time â€” whenever you're ready, tell me what you'd like to practice.",
    "Happy to listen. Go ahead whenever you want to start.",
]

RESUME_LINES = [
    "Welcome back â€” I'm listening whenever you're ready to continue.",
    "Good to see you again. Take your time; we can pick up whenever you like.",
    "I'm here. Go ahead when you want to continue.",
]
```

- [ ] **Step 3: Run tests â€” expect PASS**

```bash
cd backend && python -m pytest tests/domain/voice/test_live_token.py tests/domain/agenda/test_opening_lines.py -v
```

Expected: PASS (including existing `test_build_live_system_instruction_includes_language`).

- [ ] **Step 4: Commit (only if user asked)**

```bash
git add backend/app/domain/voice/live_session.py backend/app/domain/agenda/service.py
git commit -m "fix: give tutor turns space â€” react, develop, one invite"
```

---

# Tutor Listening Space Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Langy’s Tutor leave space for the learner — react to intent, develop the topic, and ask at most one open invitation per turn (including opening).

**Architecture:** Live and text-turn already share `build_live_system_instruction(agenda)`. Encode turn-taking rules there; soften `OPENING_LINES` / `RESUME_LINES`; sync docs + AGENTS.md. No UI, no Langfuse rewrite.

**Tech Stack:** Python / FastAPI, pytest, existing agenda + live_session modules, Markdown docs.

## Global Constraints

- Contract: react → develop → max **one** open invite; never stack multiple questions in one agent turn.
- Apply to **all** turns including opening.
- Soft Interests only when silent / unsure; do not list Interests in opening (unchanged).
- Polish only when the learner asks (unchanged).
- Out of scope: listen-mode UI toggle, Langfuse-first prompts, correction / shadowing / vocab.
- Secrets: never read `.env`; no new env vars.
- Spec SoT: `docs/superpowers/specs/2026-09-03-tutor-listening-space-design.md`.

## File map

| File | Role |
|------|------|
| `backend/app/domain/voice/live_session.py` | System instruction (turn-taking rules) |
| `backend/app/domain/agenda/service.py` | `OPENING_LINES` / `RESUME_LINES` |
| `backend/tests/domain/voice/test_live_token.py` | Assert instruction contains listening rules |
| `backend/tests/domain/agenda/test_opening_lines.py` | Assert pool invites space to speak |
| `docs/architecture-for-cursor.md` §7.1 | Durable product delta |
| `docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md` | Listening-space note |
| `AGENTS.md` | Learned User Preferences |

---

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

- [ ] **Step 3: Run tests — expect FAIL**

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
    "(2) develop the topic with comments or examples — prefer statements over questions; "
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
    "I'm listening — what would you like to talk about today?",
    "Take your time — whenever you're ready, tell me what you'd like to practice.",
    "Happy to listen. Go ahead whenever you want to start.",
]

RESUME_LINES = [
    "Welcome back — I'm listening whenever you're ready to continue.",
    "Good to see you again. Take your time; we can pick up whenever you like.",
    "I'm here. Go ahead when you want to continue.",
]
```

- [ ] **Step 3: Run tests — expect PASS**

```bash
cd backend && python -m pytest tests/domain/voice/test_live_token.py tests/domain/agenda/test_opening_lines.py -v
```

Expected: PASS (including existing `test_build_live_system_instruction_includes_language`).

- [ ] **Step 4: Commit (only if user asked)**

```bash
git add backend/app/domain/voice/live_session.py backend/app/domain/agenda/service.py
git commit -m "fix: give tutor turns space — react, develop, one invite"
```

---

### Task 3: Docs + AGENTS delta

**Files:**
- Modify: `docs/architecture-for-cursor.md` (section 7.1 Session Agenda + opening)
- Modify: `docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md`
- Modify: `AGENTS.md` (Learned User Preferences)
- Reference: `docs/superpowers/specs/2026-09-03-tutor-listening-space-design.md` (already written)

**Interfaces:**
- Produces: durable docs matching the prompt contract (no code API change)

- [ ] **Step 1: Architecture §7.1 delta**

In `docs/architecture-for-cursor.md`, under **Opening:** (after the existing Interests soft rule), add:

```markdown
**Listening space:** Every tutor turn (including opening) should (1) briefly react to the learner’s intention, (2) develop the topic with statements/examples, (3) use at most one open invitation — never stack multiple questions. Prefer giving the learner room to speak.
```

- [ ] **Step 2: Chat interests-memory design delta**

Append to `docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md`:

```markdown
## Listening space (2026-09-03)

Mid-session and opening share the same turn-taking contract: react → develop → at most one open invite; no multi-question turns. Opening/resume line pools invite space to speak (not interview openers). Soft Interests-on-silence unchanged.
```

- [ ] **Step 3: AGENTS.md preference**

Under Learned User Preferences, add a bullet:

```markdown
- Tutor turns: react to intent, develop with statements, at most one open invitation; never stack questions; opening/resume lines leave space to speak.
```

- [ ] **Step 4: Full backend pytest smoke**

```bash
cd backend && python -m pytest
```

Expected: PASS (or pre-existing failures unrelated — do not expand scope).

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add docs/architecture-for-cursor.md docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md AGENTS.md
git commit -m "docs: tutor listening-space contract in architecture and AGENTS"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| react → develop → max 1 invite | Task 2 |
| All turns including opening | Task 2 instruction wording |
| Softer OPENING/RESUME | Task 2 |
| Pytest on instruction | Task 1–2 |
| Docs §7.1 + interests-memory + AGENTS | Task 3 |
| Out of scope UI / Langfuse | Not scheduled |

No TBD placeholders. Signatures unchanged: `build_live_system_instruction(agenda: dict) -> str`.

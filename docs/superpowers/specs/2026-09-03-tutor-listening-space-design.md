# Tutor listening space — design (2026-09-03)

## Problem

Tutor often asks too many questions instead of following the learner’s intention. Learners need more space to speak.

## Goal (middle of soft ↔ strong)

- Fewer interview-style turns; clearer following of user intent.
- Not “almost never ask” — still allow **at most one** open invitation per tutor turn after reacting.

## Decisions

| Date | Decision | Why |
|------|----------|-----|
| 2026-09-03 | Middle ground: **react → develop → max 1 open invite** | Between soft (occasional closer) and strong (almost no questions) |
| 2026-09-03 | Apply to **all turns** including opening | Consistent space-to-speak feel |
| 2026-09-03 | Success = fewer questions **and** clear topic-following | Product feel, not only prompt wording |
| 2026-09-03 | Implement via **system instruction + softer OPENING/RESUME lines** | Smallest change; Live + text-turn share `build_live_system_instruction` |
| 2026-09-03 | Out of scope: UI listen-mode toggle, Langfuse-first prompt rewrite, correction/shadowing | YAGNI for this fix |
| 2026-09-04 | Exercises (repetition, drills, role-play) explicitly allowed in Chat system instruction | Model was inventing “conversation-only” refusals |
| 2026-09-04 | Exercise rules strengthened (MUST, ban conversational-only refusals, repetition wait protocol, no steer to open chat) | Soft “are allowed” still produced refusals in Live |

## Behavior (contract)

For every tutor turn (opening and mid-session):

1. **React** — briefly acknowledge / reflect the learner’s intention or last message.
2. **Develop** — continue the topic (comment, example, light vocabulary in context). Prefer statements over questions.
3. **Invite (optional)** — at most **one** open invitation to continue speaking. Not a quiz; not 2+ questions in one turn.

Hard constraints:

- Never stack multiple questions in one agent turn.
- Do not list Interests in the opening; soft Interest suggestions only when silent / unsure (unchanged product rule).
- Opening and resume lines are spacious invitations, not interview openers.
- Polish only when the learner asks (unchanged).
- When the learner asks for an exercise (repetition, drill, role-play, etc.), run it; do not refuse as “conversation-only”.

## Implementation delta

### ADDED

- Turn-taking rules in `build_live_system_instruction` (`backend/app/domain/voice/live_session.py`).
- Pytest assertions that the instruction includes max-one-invite / no-multi-question / react-to-intent guidance.

### MODIFIED

- `OPENING_LINES` / `RESUME_LINES` in `backend/app/domain/agenda/service.py` — invite space to speak.
- Docs delta: `docs/architecture-for-cursor.md` §7.1; `docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md` (listening space note).
- `AGENTS.md` Learned User Preferences — Chat turn-taking preference.

### REMOVED

- None (behavior change via prompt wording only).

### OUT OF SCOPE

- New UI control for “more questions vs more listening”.
- Moving prompt SoT to Langfuse-only for this change.
- Correction, shadowing, mnemonics, vocab extraction.

## Requirements (Given / When / Then)

1. **Given** an agenda, **When** `build_live_system_instruction` runs, **Then** the text includes react-to-intent, develop-with-statements, max one open invite, and no multi-question stacking.
2. **Given** session start / resume, **When** an opening or resume line is chosen from the pool, **Then** the line invites the learner to speak without interview-style interrogation tone.
3. **Given** Chat docs (§7.1 / interests-memory), **When** a reader checks opening/agenda behavior, **Then** they see the listening-space contract (delta, not a full rewrite).
4. **Given** the learner asks for a repetition (or similar) exercise, **When** the tutor replies, **Then** it runs the exercise (one phrase, wait for repeat) and does not refuse as conversation-only / free-flowing chat.
5. **Given** `build_live_system_instruction` / chained tutor system prompt, **When** built, **Then** the text includes mandatory exercise rules (`MUST`, no conversational-only refusal, wait-for-repeat, do not steer to open chat).

## Verification

- `cd backend && python -m pytest` (focus: voice live instruction + any agenda line tests).
- No Gemini Live E2E required for this prompt/docs change.
- Manual smoke (optional): one Chat turn after deploy — agent should not fire 2+ questions in a single reply.

## Sync

Durable product wording also lands as a short delta in architecture §7.1 and the existing chat-interests-memory design when implementing (plan task).

# Chat brevity, voice controls & Memory essay UI — design (2026-09-03)

## Problem

1. Tutor replies are often 3–6× longer than learner turns → too much listening vs speaking time.
2. Chat chrome: Speak is a side button; no Stop while tutor speaks; Tutor/Listening are wide toggles that crowd the bar.
3. TTS glitches need **respeak** of a given Agent turn without replaying a Live stream.
4. Speaking speed is not adjustable; Profile already has voice picker.
5. Memory facts are card-rows with Edit/Delete chrome; learner wants one continuous text wall.

## Goals

- Prefer learner speaking time over listening time by default.
- Allow longer tutor replies when the learner **asks** for explanation, dialogue, story, or “tell me more”.
- Chat UX: clickable presence waves = Speak; Send ↔ Stop; Tutor/Listening as accent dots under History; speaker icon on Agent lines; speed in Profile.
- Memory: essay look, per-fact tap to edit (variant B).

## Non-goals

- Hard max-token / post-hoc truncation of model replies (~25-word cut) — rejected (risk of mid-sentence cuts; blocks intentional long answers).
- Replay of Live audio buffers (respeak always synthesizes from stored transcript text).
- Changing correction / Translate-on-select behavior.
- Redesigning session summaries list (only facts become essay UI).

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-03 | Soft brevity in system instruction (default short; expand on request) | Matches “more speaking than listening” without blocking long asks |
| 2026-09-03 | No post-generation truncation | Avoids clipped answers; length is prompt guidance only |
| 2026-09-03 | Approach: prompt + UI (not truncate-after) | Cheap, one instruction source, covers Live + text-turn + chained |
| 2026-09-03 | AgentPresence waves = Speak once | Primary mic affordance on main stage |
| 2026-09-03 | Composer Send becomes Stop while tutor speaking/writing | One slot; Stop always available when audio/generation active |
| 2026-09-03 | Tutor voice + Listening = dots under History (on = `--color-accent`, off = dark) | Less chrome; Classical accent |
| 2026-09-03 | Respeak = speaker icon on Agent turns only | Does not fight text selection for dictionary |
| 2026-09-03 | Speaking speed slider in Menu → Profile (with VoicePicker) | Persistent preference |
| 2026-09-03 | Memory facts = continuous essay; tap sentence = edit that fact | Variant B; same DB rows |
| 2026-09-03 | Live rate: speed applies to TTS/respeak; Live natural tempo if API lacks rate | Honest scope |

## Architecture

### Prompt (backend)

Single shared brevity fragment used by:

- `build_live_system_instruction` (Gemini Live)
- text-turn (appended / merged, not a weak lone “Reply briefly”)
- chained pipeline tutor system string

**Content (normative intent, not final copy):**

- Default: 1–2 short sentences + at most one question; prefer learner talk time.
- Do not pad with recap, generic praise, or multi-part elaborations unless asked.
- If learner asks for longer explanation, example dialogue, story, or similar — answer at appropriate length.
- Polish only on explicit request (unchanged).

Tests: unit asserts instruction contains brevity rules; optional promptfoo scenario for short vs “explain in detail”.

### Chat chrome (frontend)

**Header (right of language switcher):**

- History button (unchanged).
- Below / aligned under History (right corner): two large hit targets (≥44px) showing **dots** — Tutor voice, Listening. On → fill `--color-accent`; off → dark/divider. `aria-pressed` + accessible names.

**Stage:**

- `AgentPresence` clickable when session active and Listening **off** → same behavior as today’s Speak once (Web Speech one-shot).
- When Listening **on**, waves are status-only (no second STT path). `aria-label` / disabled state as appropriate.

**Composer:**

- Input + **Send**.
- While tutor is **speaking** or **thinking** (writing/generating): same control shows **Stop** (enabled even if input empty). Stop: `cancelSpeech()` + interrupt/disconnect Live output stream without permanently flipping Tutor voice off (unless user turns Tutor voice off separately).
- Remove Speak button beside input (Speak moves to waves).

**Control bar:**

- Remove wide Tutor voice / Listening buttons.
- Keep **End session** full-width under composer.

**Transcript:**

- Agent line: speaker control → `speakTutorLine` with profile speed.
- Selection → Translate / Add unchanged.

### Speaking speed (Profile)

- Slider (e.g. 0.75 / 1.0 / 1.25 / 1.5) next to Tutor voice picker, Menu → Profile.
- Persist with user profile preferences (same persistence pattern as voice key / custom voice id).
- Apply to browser `SpeechSynthesisUtterance.rate` and server TTS `HTMLAudioElement.playbackRate`.
- Gemini Live: if no rate API, document that Live stays natural; respeak/TTS honor speed.

### Memory UI

- Facts render as one continuous block (paragraphs or line breaks between facts), no per-fact cards.
- Tap a fact → inline edit for that id only (Save / Cancel / Delete).
- Recent session notes section stays list/cards (out of scope for essay).

## Data / API

- Prefer extending existing profile preference fields for `tts_playback_rate` (or equivalent name). If no column yet, follow current voice-preference storage pattern.
- Memory: existing CRUD endpoints; no schema change.

## Given / When / Then

1. **Given** a short learner turn without a request for detail, **When** the tutor replies, **Then** the system instruction biases toward a short reply (1–2 sentences + optional question); no hard word cut is applied.
2. **Given** the learner asks to explain in detail / longer dialogue, **When** the tutor replies, **Then** a longer answer is allowed.
3. **Given** an active session with Listening off, **When** the learner taps the presence waves, **Then** Speak-once STT starts (same as former Speak button).
4. **Given** the tutor is speaking or thinking, **When** the learner taps Stop, **Then** playback/stream stops immediately; Tutor voice preference stays as it was.
5. **Given** Tutor voice on, **When** viewing header dots, **Then** the Tutor dot uses accent color; off uses dark.
6. **Given** an Agent transcript line, **When** the learner taps the speaker icon, **Then** that line is spoken via TTS at the profile speed.
7. **Given** speaking speed set in Profile, **When** TTS/respeak runs, **Then** rate matches the saved preference.
8. **Given** N memory facts, **When** viewing Memory, **Then** they appear as one continuous text; **When** tapping one fact, **Then** only that fact enters edit mode.

## Out of scope / follow-ups

- Live playback rate if/when Gemini exposes it.
- Essay UI for session summaries.
- Automatic CEFR-scaled length curves (soft default only for now).

## Sync

- Update `docs/ux/ux-ui-spec.md` §11.1 Chat chrome + Memory note when implementing.
- Update `docs/architecture-for-cursor.md` §7.1 agenda/prompt with soft brevity.
- Working plan: `.cursor/plans/` + `docs/superpowers/plans/` after this spec is approved for implementation.

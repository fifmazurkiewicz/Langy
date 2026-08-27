# Design — CEFR placement + optional study plan & lessons

**Date:** 2026-08-27  
**Status:** approved  
**Product:** Langy  
**Related:** FreeLingo reference map (no fork) — `.cursor/plans/2026-08-27-freelingo-keep-adapt-drop.md`

## Goal

Add FreeLingo-style **CEFR A1–C2 placement** and a **4 / 8 / 12 / 16 week study plan**, with **lessons as an optional path**. Chat, Memo (FSRS + Pending), Memory, and spend_cap remain the product pillars. Users may skip the plan entirely and still use Langy.

## Non-goals (this design)

- Replacing Classical 3-tab IA with FreeLingo sidebar
- XP / streaks / gamification dashboard (MVP)
- Listening/Reading hub apps, Phrasebook (MVP)
- ja / ko / zh curriculum in first curriculum ship
- End-of-level completion test (defer)
- Forcing lessons before Chat
- Mapping self-assessment 1–5 ↔ CEFR automatically

## Decisions (locked)

| Topic | Choice |
|---|---|
| Placement in onboarding | **Optional** — Skip allowed; Chat without a plan |
| Self-assessment 1–5 vs CEFR | **Both** — skills stay on profile; CEFR only from placement → plan |
| Lessons | **Optional** — Menu → Plan; never block Chat/Memo |
| Lesson vocabulary | Same Pending queue; `source=lesson` |
| Plan intensity | 4 / 8 / 12 / 16 weeks (FreeLingo `duration_weeks` + derived `days_per_week`) |
| Auth / hosting / SRS | Unchanged Langy stack (Supabase, FSRS, no Redis MVP) |

## User journey

### Onboarding (per language flow unchanged + optional placement)

1. Language multi-select (en-GB, en-US, de, es, it).
2. For each language: Motivation / Interests / Self-assessment 1–5 (each Skip OK).
3. **Optional:** CEFR placement + intensity 4/8/12/16 → create `study_plan` for that language. **Skip** → no plan.
4. Explicit `active_language`.
5. Interests still trigger Generate first words → Pending (unchanged).
6. Land on **Chat**.

### Later entry to Plan

- Menu → **Plan** (or soft CTA if no plan).
- If no plan: run placement + intensity, then show grid.
- If plan exists: today / week view; open optional lessons; skip day / progress as FreeLingo semantics where adapted.

### Chat with or without plan

- No plan: agenda = profile (skills, motivations, interests) + memory + summaries (as today).
- With plan: agenda **may** soft-inject CEFR level + current unit/topic — never force a lesson script; user leads. Opening still varied “what to talk about / learn?” without listing Interests.

## Information architecture

| Surface | Role |
|---|---|
| Chat | Default home — voice/text |
| Memo → Flashcards | Due / Categories / Pending / Quizlet export |
| Menu | Account, languages, Memory, **Plan** (optional), settings, Admin |

Plan is **not** a fourth bottom tab in MVP.

## Data model (ADDED / MODIFIED)

### `user_language_profile` (MODIFIED)

Keep: `motivations`, `interests`, `skill_*` (1–5).

ADDED (nullable):

- `cefr_level` text null — `A1`…`C2`, set only after placement (not from skills mapping)

### `study_plans` (ADDED — adapted from FreeLingo)

Per `(user_id, language)` at most one **active** plan.

Fields (conceptual): `cefr_level`, `language`, `duration_weeks` (4|8|12|16), `days_per_week`, `progress_day`, `generated_plan` JSON, `is_active`, timestamps. UUID `user_id` (Supabase). RLS: `auth.uid() = user_id`.

### `lessons` (ADDED)

Lazy-created when user opens a slot: `study_plan_id`, title, `lesson_type` (`grammar`|`vocabulary`|`reading`|`writing`|`listening`|`speaking`|`review`), content/exercises JSON, `is_completed`, week/day indices.

### `vocab_items.source` (MODIFIED)

Add `'lesson'`.

Full set: `chat_extraction` | `agent_save` | `category_generated` | `transcript_selection` | `lesson`.

Lesson-sourced rows: `status=pending` until Accept/Reject.

## Behavior — Given / When / Then

| Given | When | Then |
|---|---|---|
| Onboarding, user skips placement | Finishes onboarding | No study_plan; Chat available |
| Onboarding, user completes placement + intensity | Finishes onboarding | Active study_plan for that language; Chat available |
| User has no plan | Opens Menu → Plan | Placement + intensity flow |
| User has plan | Opens a lesson slot first time | LLM generates lesson; GenAI → ledger; blocked at spend_cap |
| Lesson yields vocabulary candidates | Lesson completion or explicit extract step | Pending items `source=lesson`; Memo badge |
| User never opens Plan | Uses Chat/Memo only | Full core product; no forced CTAs beyond optional soft suggest |
| At spend_cap | Start/generate lesson | Blocked; existing Chat review / FSRS still OK |

## Spend / observability

- Placement GenAI (if any), lesson generation, lesson vocab extraction → `usage_ledger` + Langfuse.
- Same monthly `spend_cap` as Chat/Memo costly actions.

## Curriculum scope (first ship)

- Reimplement deterministic grid generator (reference: FreeLingo `study_plan_generator` semantics).
- Ship curriculum data for **en-GB / en-US** first; **de / es / it** schema-ready (stubs or partial OK).
- Drop ja/ko/zh from first Langy curriculum ship.

## Reference mapping (not import)

See `.cursor/plans/2026-08-27-freelingo-keep-adapt-drop.md`. Reimplement assessment, study plan grid, lesson generator; skip SM-2, Redis, Stripe, sidebar-as-home, XP MVP.

## Out of scope follow-ups

- Package coach roadmap (transcript → correction → shadowing → mnemonics) remains separate.
- End-of-level test, Listening/Reading hubs, Phrasebook, XP.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-08-27 | CEFR + 4/8/12/16 plan in Langy | User — adopt FreeLingo structured path |
| 2026-08-27 | Lessons optional | Chat-first; plan is additive |
| 2026-08-27 | Placement optional Skip in onboarding | Time-to-Chat |
| 2026-08-27 | Keep skills 1–5 and CEFR separate | No magic mapping |
| 2026-08-27 | Lesson vocab → Pending `lesson` | One quality gate for all sources |

---
name: 2026-08-26 docs-decisions-delta
overview: Sync docs with product decisions (language switcher, per-language profile, spend cap, Langfuse, promptfoo, Quizlet export).
todos:
  - id: arch
    content: Update architecture-for-cursor.md
    status: completed
  - id: ux
    content: Update ux-ui-spec.md and ux-ui-decisions.md
    status: completed
  - id: hygiene
    content: Sync AGENTS, README, .env.example, plan decisions
    status: completed
---

# Plan — docs decisions delta (2026-08-26)

## Goal

Bring living contract in `docs/` in line with decisions from clarification sessions. No app code.

## Decisions (2026-08-26)

| Decision | Why |
|---|---|
| One language switcher; changes context everywhere | Single source of active language |
| Classical markers (GB/US/DE), no emoji flags | Visual SoT is Classical DS |
| English first for voice MVP; multi-language supported in model/UI from start | Priority learning language is English; others must not be bolted on later |
| Motivation + interests **per language** | Interview depends on language; category sets are language-scoped |
| Native language always Polish | Product audience / L1 fixed |
| Vocab candidates: accept / reject by user | User controls deck quality |
| In-chat save: agent tool when user asks to save a word | Voice command path, not manual UI picker in MVP |
| Monthly spend_cap (calendar month); costs = TTS + ASR + GenAI | Admin cost governance |
| At cap: block costly actions for rest of month; Words review still allowed | Soft lock, not full app lock |
| FSRS state persisted in Postgres | Durable scheduling across cold starts |
| Langfuse: tracing, cost, prompt management | Ops for public free app |
| promptfoo: pre-deploy evals | Regression gate for prompts |
| Export flashcards to `.txt` for Quizlet paste | Outbound only in MVP; Quizlet *import into Langy* still Phase 2 |
| Public free app + own use; AGPL applies to source disclosure | Not closed-source white-label |
| Ignore missing helper specs for now | User: don't block on absent docs |

## Delta

- **MODIFIED:** `docs/architecture-for-cursor.md`, `docs/ux/ux-ui-spec.md`, `docs/ux/ux-ui-decisions.md`, `AGENTS.md`, `.env.example`, `docs/README.md`
- **ADDED:** this plan

---
name: 2026-08-27 freelingo keep-adapt-drop
overview: Reference map FreeLingo → Langy (no fork). CEFR + optional lessons decided.
status: reference-only
todos:
  - id: table
    content: Publish keep/adapt/drop table
    status: completed
  - id: clarify-cefr
    content: Clarify CEFR vs Chat-first / lessons optional UX
    status: completed
  - id: sync-architecture
    content: After approval, delta architecture + UX + ADR
    status: completed
---

# FreeLingo → Langy — reference map (2026-08-27)

> **Not a fork.** Langy is greenfield. This table maps what to **reimplement** vs **skip**, informed by reading [FreeLingo](https://github.com/ArtCC/freelingo). ADR: `docs/technical/decisions/2026-08-27-greenfield-no-freelingo-fork.md`.

Legend: **Keep** = reimplement same idea · **Adapt** = same idea, Langy stack/UX · **Drop** = not in Langy MVP

## New product decisions (draft until UX clarified)

| Decision | Draft choice |
|---|---|
| CEFR A1–C2 | **In** Langy |
| Placement assessment | **In** — onboarding **optional** (Skip); Chat without plan OK; complete later via Plan |
| Study plan intensity | **4 / 8 / 12 / 16 weeks** (FreeLingo model) |
| Lessons | **Optional** — user may follow plan lessons; Chat/Memo remain core loop |
| Self-assessment 1–5 | **Keep** alongside CEFR — separate fields; CEFR only from placement → plan |
| Lesson vocabulary | Same **Pending** queue; `source=lesson` (Accept/Reject) |
| Chat / Memo / FSRS / Pending / spend_cap | Unchanged as product pillars |

## Keep / adapt / drop

Legend: **Keep** = reuse with thin Langy wiring · **Adapt** = reuse core, change auth/SRS/UX/hosting · **Drop** = do not ship in Langy MVP (may revisit later)

### Platform / infra

| FreeLingo area | Decision | Notes for Langy |
|---|---|---|
| `backend/` FastAPI monorepo layout | **Adapt** | Keep modules; host on Render; no Redis-required paths |
| `frontend/` Next.js App Router | **Adapt** | Classical 3-tab (+ optional Plan/Lessons entry) |
| Docker Compose (Postgres+Redis+Kokoro+Whisper) | **Drop** (as default) | Optional later; local = native / Supabase |
| Redis (sessions, freemium, locks, invites) | **Drop** | JWT via Supabase; jobs in Postgres |
| Stripe / `billing.py` / freemium quotas | **Drop** | Replaced by `spend_cap` USD ledger |
| Email/password auth + verify/reset | **Drop** | Google OAuth (Supabase) |
| Admin CRUD users / maintenance / banner | **Adapt** (thin) | Cap UI + allowlist emails; drop hosted-ops chrome |
| CI → GHCR images | **Adapt** | Align with Langy deploy (Vercel/Render) |
| AGPL-3.0 | **Keep** | Fork obligations |

### CEFR / plan / lessons (NEW — in scope)

| FreeLingo area | Decision | Notes for Langy |
|---|---|---|
| Placement assessment (`assessment.py`) | **Adapt** | Output CEFR A1–C2; feed study plan; reconcile with self-assessment 1–5 |
| `study_plan_generator.py` (deterministic grid) | **Keep/Adapt** | Keep 4/8/12/16 + days_per_week; key by Supabase user + `target_language` |
| `study_plans` / `lessons` models | **Adapt** | UUID user ids; RLS; language = active Langy language |
| Curriculum static data (`backend/app/data/`) | **Adapt** | Start with en-GB/en-US (+ de/es/it stubs); drop ja/ko/zh from MVP unless needed |
| `lesson_generator.py` + lesson types | **Adapt** | **Optional path** — generate on open; costs → ledger + cap |
| Lesson UI `/lesson/[id]`, My Plan drawers | **Adapt** | Not forced home; entry from Menu or soft CTA |
| Progress day / skip day / unit review prompt | **Adapt** | Keep semantics if Plan enabled for user |
| End-of-level completion test | **Adapt** (later OK) | Not required for first ship of optional lessons |
| XP / streaks / dashboard gamification | **Drop** (MVP) | Optional later; FSRS Due is primary retention signal |

### Chat / voice / memory

| FreeLingo area | Decision | Notes for Langy |
|---|---|---|
| Chat SSE (`chat.py`) | **Adapt** | Agenda = profile + memory + optional CEFR/plan context |
| Voice WebSocket chained pipeline | **Adapt** | Keep as `VOICE_MODE=chained`; default still Live |
| Gemini Live / speech_to_speech | **Build** (Langy) | Not in FreeLingo |
| VAD / conversation frontend | **Adapt** | Map to listening toggle |
| Memories + `save_user_memory` tool | **Adapt** | Global facts; + Langy session summaries after End |
| Lingu persona / FreeLingo copy | **Adapt** | Langy branding; English UI |

### Vocabulary / SRS

| FreeLingo area | Decision | Notes for Langy |
|---|---|---|
| Flashcards API | **Adapt** | Wire to `vocab_items` + **FSRS** (replace SM-2) |
| `flashcard_sm2.py` | **Drop** | Replace with `py-fsrs` |
| from-word / text selection → card | **Adapt** | → Pending (`transcript_selection`), not auto-card |
| LLM generate flashcards by topic | **Adapt** | → Pending (`category_generated`) |
| Pending Accept/Reject | **Build** (Langy) | Core differentiator |
| Quizlet `.txt` export | **Build** (Langy) | — |
| Phrasebook hub | **Drop** (MVP) | Optional later |
| Listening/Reading exercise apps | **Drop** (MVP) | Overlap with optional lessons; revisit |

### Languages / onboarding / UX

| FreeLingo area | Decision | Notes for Langy |
|---|---|---|
| Multi study plans per language | **Adapt** | One plan per `(user, language)` |
| Native language picker | **Drop** | L1 always PL |
| Target set en/es/it/de/fr/pt/ja/ko/zh | **Adapt** | MVP targets: en-GB, en-US, de, es, it |
| next-intl multi UI locales | **Drop** (MVP) | UI English only |
| Sidebar IA (Plan, Progress, Tutor, …) | **Drop** | Classical Chat / Memo / Menu |
| Plan + Lessons as optional surfaces | **Build/Adapt** | Entry points without replacing Chat as default |
| Motivation / Interests per language | **Build** (Langy) | Keep; may seed plan `goals` |
| Self-assessment 1–5 | **Adapt** | Coexist or map ↔ CEFR — **open question** |

### Observability / cost

| FreeLingo area | Decision | Notes for Langy |
|---|---|---|
| Token quota / freemium counters | **Drop** | `spend_cap` + `usage_ledger` |
| Langfuse + promptfoo | **Build** (Langy) | Including lesson + placement prompts |

## Implied IA (draft)

- **Chat** — default home (voice/text)
- **Memo** — Flashcards (Due / Categories / Pending / export) · Shadowing · Mnemonics
- **Menu** — account, languages, memory, **Plan (optional)**, settings, admin  
  - Plan: placement (if missing) → intensity 4/8/12/16 → today’s optional lessons  
  - Skipping Plan forever is allowed; Chat/Memo still work

## Open questions

All resolved (2026-08-27). See ADR greenfield + CEFR spec.

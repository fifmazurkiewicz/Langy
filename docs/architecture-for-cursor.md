# Architecture Specification — for implementation (Cursor)

This is the **business + technical** project description for implementation. UX/UI behavior is fully defined in [`ux/ux-ui-spec.md`](./ux/ux-ui-spec.md) — this document assumes that as given and focuses on product scope, stack, domain, and how to build it. Deeper market/business write-ups (when added) live under [`business/`](./business/).

**Product posture:** public free web app (own use + open access). **Greenfield codebase** — FreeLingo is [reference only](#2-freelingo-as-reference-no-fork), not a fork. Native language (L1) is **always Polish** (not configurable).

## 1. MVP Scope (build this first, nothing else)

- Chat-based voice conversation. **English is the priority learning language** for end-to-end voice quality first (`en-GB` and/or `en-US` as separate languages). Schema, onboarding, and UI must support German / Spanish / Italian from the start — do not hardcode English-only paths — but voice QA for non-English can follow after English works.
- Memo → Flashcards vocab sources in MVP:
  - `chat_extraction` (post-session candidates → user accept/reject)
  - `agent_save` (user asks the agent mid-chat to save a word)
  - `category_generated` (LLM batches per interest category)
  - `transcript_selection` (in-session select span → Add to learning → Pending) — Package 1 coach
  - `lesson` (optional study-plan lessons → Pending)
  - `shadowing` (Memo → Shadowing mid-Add or end batch → Pending) — Package 4
- **Optional structured path:** CEFR A1–C2 placement → study plan 4/8/12/16 weeks → optional lessons (Menu → Plan). Skip allowed; Chat/Memo work without a plan. Spec: [`superpowers/specs/2026-08-27-cefr-optional-plan-lessons-design.md`](./superpowers/specs/2026-08-27-cefr-optional-plan-lessons-design.md).
- Bottom nav: **Chat / Memo / Menu**. Memo = Flashcards + Shadowing + Mnemonics. Specs: [`shadowing-memo`](./superpowers/specs/2026-08-27-shadowing-memo-design.md), [`mnemonics`](./superpowers/specs/2026-08-27-mnemonics-design.md).
- **Outbound export:** download / copy flashcards as `.txt` suitable for pasting into Quizlet. **Inbound** Quizlet import and manual Quizlet-style card authoring remain Phase 2 (out of MVP).
- Single responsive PWA (web only).
- Google OAuth, admin panel with **monthly** per-user spend cap — foundational at MVP.
- Observability: **Langfuse** (tracing, cost, prompt management). Pre-deploy prompt regression: **promptfoo**.

## 2. FreeLingo as reference (no fork)

Langy is **greenfield**: own `backend/` + `frontend/` built from this document and UX specs. [FreeLingo](https://github.com/ArtCC/freelingo) is **reference only** — study patterns locally or upstream; **do not import** its code into this repo. ADR: [`technical/decisions/2026-08-27-greenfield-no-freelingo-fork.md`](./technical/decisions/2026-08-27-greenfield-no-freelingo-fork.md). Keep/adapt/drop map: `.cursor/plans/2026-08-27-freelingo-keep-adapt-drop.md`.

### 2.1 Patterns to reimplement (informed by reference)

| Pattern | Langy implementation |
|---|---|
| en-GB / en-US as separate languages | Schema + onboarding from day one |
| Flashcards + spaced repetition | **FSRS** (`py-fsrs`) in Postgres — not SM-2 |
| Agent save-word tool | Langy tool calling + Pending/accepted paths |
| Language switcher + multi-language profiles | One Classical switcher → Chat + Memo + profile |
| L1-aware translations | L1 **always PL** |
| Voice/text transport | Own adapter (§4); Gemini Live default |
| User memory notes | Global facts + session summaries (§7) |
| CEFR placement + plan 4/8/12/16 + lessons | Optional Menu → Plan; reimplement generators |

### 2.2 Langy-native (spec-driven)

| Element | Why greenfield |
|---|---|
| Pending accept/reject + multi-source vocab | Core differentiator |
| Motivation / Interests **per language** | Product model |
| spend_cap ledger (TTS+ASR+GenAI) | Public free app governance |
| PWA Classical UI (Chat / Memo / Menu) | Memo = Flashcards + Shadowing + Mnemonics |
| Coach packages 1→2→4→3 | Transcript, correction, shadowing, mnemonics |
| Langfuse + promptfoo | Ops and prompt quality |
| Supabase auth (Google OAuth) + RLS | Deployment standard |

### 2.3 Profil językowy — rozstrzygnięte

`motivations` i `interests` żyją na **`user_language_profile` (per język)**, nie globalnie na `users`. Global Memory (facts + summaries) is separate from structured per-language profile.

### 2.4 Licencja

Langy codebase is **not** a FreeLingo fork — no AGPL inheritance from upstream code. Product license for Langy repo TBD at first public release; reference reading of FreeLingo does not copy its license into Langy.

## 3. Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | **FastAPI** (greenfield) | Python 3.12; Render Docker |
| Backend hosting | **Render** Free (Docker) | Cold start OK; UI “Waking up…”; `api-langy.fmazurkiewicz.dev` |
| Frontend | **Next.js** PWA (greenfield) | Classical DS; `langy.fmazurkiewicz.dev` |
| Frontend hosting | **Vercel** | |
| Database + Auth | **Supabase** (Postgres, Google OAuth, RLS) | FSRS + ledger + profiles + job queue |
| Voice + text | Adapter §4. Default Gemini Live + OpenRouter | `VOICE_MODE` switches Live vs chained |
| Spaced repetition | **FSRS** via `py-fsrs`, in Postgres | |
| AI observability | **Langfuse Cloud** | Runtime SoT for prompts |
| Prompt regression | **promptfoo** | Fixtures in repo; gate before deploy |
| Async jobs | **Postgres** job table / polling | **No Redis in MVP** |
| Admin bootstrap | `ALLOWED_ADMIN_EMAILS` | Sole admin: `fifmazurkiewicz@gmail.com` |

## 4. Provider Abstraction Layer

Wymóg: swobodne przełączanie dostawców bez przepisywania logiki. Dwa interfejsy: tekst vs głos. Config przez env.

### 4.1 `TextCompletionProvider`

`complete(messages, response_model) -> T`. Default: OpenRouter (`TEXT_PROVIDER`, `TEXT_MODEL`).

### 4.2 `VoiceConversationProvider`

- **`VOICE_MODE=speech_to_speech` (default):** Gemini Live (or later OpenAI Realtime). **Browser ↔ Live directly** after API issues short-lived session credentials. Render handles auth, session agenda payload, **tool calls** (e.g. save-word), spend checks, transcript persistence, jobs — not the media proxy.
- **`VOICE_MODE=chained`:** STT → LLM → TTS **all via Render** (`STT_PROVIDER`, `TTS_PROVIDER`, text provider).
- Shared app contract so Chat UI does not care which mode is active.

### 4.3 Chat listening UX (product rule)

- **Optional listening toggle** (on/off). Not push-to-talk; not a mic button pressed for every utterance.
- Toggle **on** → hands-free speech; **VAD** owns turn-taking until toggle off or **End session**.
- Toggle **off** → mic not capturing (user choice).
- iOS/browser: turning the toggle **on** supplies the required user gesture for mic/audio — no separate mandatory “must tap to start” screen beyond that control.

### 4.4 Langfuse + promptfoo

- **Langfuse Cloud** = runtime source of truth for prompts (agenda, extraction, generate, tool instructions).
- Repo keeps **promptfoo fixtures** (and optional exported snapshots) for CI; failures block deploy.
- Every GenAI / ASR / TTS usage that we meter also feeds Langfuse traces + `usage_ledger` (cost governance).

### 4.5 Start recommendation

Ship both voice modes behind env; default Live. Prove adapter with one concrete chained STT/TTS pair when needed.

## 5. Domain model summary

**Bounded contexts:**

- **Voice Conversation** — chat loop, VAD, listening toggle, opening question, session agenda, agent tools, L1 (PL) on request
- **Vocabulary Extraction** — post-session candidates → Pending
- **User Memory** — global lasting facts + session summaries; Menu CRUD
- **Spaced Repetition** — FSRS in DB; Quizlet export
- **Language Profile** — per-language motivation, interests, self-assessment, optional CEFR, active language
- **Optional Study Plan** — CEFR placement → 4/8/12/16 week grid → optional lessons; lesson vocab → Pending
- **Spend Governance** — monthly cap, ledger, admin

**Key invariant:** all vocabulary sources land in one `vocab_items` / `fsrs_cards` pair with `UNIQUE(user_id, language, term)`.

**User journey SoT:** [`superpowers/specs/2026-08-26-domain-user-journey-design.md`](./superpowers/specs/2026-08-26-domain-user-journey-design.md).

**Key events (summary):**

`KonwersacjaRozpoczęta` → opening question → … → **End session** → `KonwersacjaZakończona` → (async) vocab Pending path **and** `AktualizacjaPamięciUżytkownika` (facts + summary).

Parallel: onboarding / category generate → Pending. In-chat: `agent_save`.

## 6. Data model (authoritative)

```sql
users (
  id                    uuid primary key,  -- = Supabase auth.uid()
  email                 text,
  display_name          text,
  is_admin              boolean default false,
  spend_cap_usd         numeric default 10, -- monthly USD; default $10; admin-editable
  active_language       text,              -- set explicitly at end of onboarding
  onboarding_completed_at timestamp
  -- L1 is always Polish; no native_language column
);

user_language_profile (
  id                    uuid primary key,
  user_id               uuid references users,
  language              text,              -- 'en-GB' | 'en-US' | 'de' | 'es' | 'it'
  motivations           text[],            -- per language, e.g. ['career','other:…']
  interests             text[],            -- per language; seeds flashcard_sets
  skill_reading         int,               -- 1-5
  skill_speaking        int,
  skill_writing         int,
  skill_listening       int,
  skill_vocabulary      int,
  cefr_level            text nullable,     -- 'A1'..'C2' from placement only; not mapped from skills
  assessed_at           timestamp,
  unique(user_id, language)
);

usage_ledger (
  id                    uuid primary key,
  user_id               uuid references users,
  action_type           text,              -- 'tts' | 'asr' | 'gen_ai' | more specific if useful
  cost_usd              numeric,
  provider              text nullable,
  langfuse_trace_id     text nullable,
  created_at            timestamp
);

conversations (
  id                    uuid primary key,
  user_id               uuid references users,
  language              text,
  started_at            timestamp,
  ended_at              timestamp nullable,
  transcript            text,
  audio_ref             text nullable
);

flashcard_sets (
  id                    uuid primary key,
  user_id               uuid references users,
  language              text,
  category_key          text,
  is_custom             boolean,
  created_at            timestamp
);

vocab_items (
  id                    uuid primary key,
  user_id               uuid references users,
  language              text,
  term                  text,
  translation           text,
  context_sentence      text nullable,
  flashcard_set_id      uuid references flashcard_sets nullable,
  source                text,              -- 'chat_extraction' | 'agent_save' | 'category_generated' | 'transcript_selection' | 'lesson' | 'correction' | 'shadowing'
  status                text,              -- 'pending' | 'accepted' | 'rejected'
  flag_reason           text nullable,     -- chat_extraction only
  unique(user_id, language, term)
);

fsrs_cards (
  id                    uuid primary key,
  vocab_item_id         uuid references vocab_items,  -- only for accepted items
  stability             numeric,
  difficulty            numeric,
  due_at                timestamp,
  review_history        jsonb
);

-- Optional structured path (Menu → Plan); one active plan per (user, language)
study_plans (
  id                    uuid primary key,
  user_id               uuid references users,
  language              text,
  cefr_level            text,              -- A1..C2
  duration_weeks        int,               -- 4 | 8 | 12 | 16
  days_per_week         int,
  progress_day          int default 0,
  generated_plan        jsonb,
  is_active             boolean default true,
  created_at            timestamp,
  unique(user_id, language)  -- enforce single active via is_active + app rules if history kept
);

lessons (
  id                    uuid primary key,
  study_plan_id         uuid references study_plans,
  title                 text,
  lesson_type           text,              -- grammar|vocabulary|reading|writing|listening|speaking|review
  week_number           int,
  day_number            int,
  content               jsonb nullable,    -- lazy LLM fill
  is_completed          boolean default false,
  created_at            timestamp
);

-- Global user memory (not per learning language)
user_memory_facts (
  id                    uuid primary key,
  user_id               uuid references users,
  content               text,
  source_conversation_id uuid references conversations nullable,
  created_at            timestamp,
  updated_at            timestamp
);

conversation_summaries (
  id                    uuid primary key,
  user_id               uuid references users,
  conversation_id       uuid references conversations,
  language              text,              -- session language (metadata)
  summary               text,              -- 1–3 sentences
  created_at            timestamp
);
```

RLS: `auth.uid() = user_id`; admin bypass for admin panel.

## 7. Key application logic

### 7.1 Session Agenda + opening

Build ephemeral system prompt from:

- `user_language_profile` for **active language** (skills, motivations, interests)
- due `fsrs_cards` (opportunistic weave only)
- up to **50** `user_memory_facts` (recent / salient)
- **last 3** `conversation_summaries`

**Opening:** first agent turn uses a **varied** line from a small pool — ask what to talk about today or what they’re learning. **Do not** list Interests in that opening. If user is silent / unsure, Agent may **softly** suggest from Interests — never force a lesson plan. User leads. Polish only on explicit request.

**Listening space:** Every tutor turn (including opening) should (1) briefly react to the learner's intention, (2) develop the topic with statements/examples, (3) use at most one open invitation — never stack multiple questions. Prefer giving the learner room to speak.

### 7.2 Session end + extraction + memory + Pending

- Session ends **only** via explicit **End session**.
- Chat → Idle immediately; background job wave:
  1. Vocab candidates → Pending (`chat_extraction`)
  2. **Memory:** upsert lasting **facts** (global) + write **session summary**
- Empty vocab → toast “No new words from that chat”. Facts/summary may still update.
- Memo Flashcards badge for Pending. Accept/Reject as before; Pending never expires. Memory GenAI → ledger + Langfuse.

### 7.3 Agent save-word tool

When user says (voice) to save a word/phrase, the Live (or chained) agent issues a **tool/function call**; backend upserts `vocab_items` (`source=agent_save`, `status=accepted`), creates FSRS card, returns ack for the agent to speak. Dedup if already present. Does **not** go through Pending.

### 7.3b Transcript + selection dictionary

Persist full session **transcript** text in `conversations` for extraction and debug. MVP: no stored audio blobs (`audio_ref` null).

**In-session UX:** transcript is **always visible** during an active Chat. Learner may select one word, several words, or a whole sentence → **Translate** (PL + example sentence L2/PL) or **Add to learning** → Pending (`source=transcript_selection`). After Translate, **Add to learning** remains available. REST + per-user `selection_lookup_cache`; not Live tools. Spec: [`superpowers/specs/2026-08-27-transcript-selection-dictionary-design.md`](./superpowers/specs/2026-08-27-transcript-selection-dictionary-design.md).

```text
selection_lookup_cache (
  id uuid pk,
  user_id uuid,
  language text,
  normalized_span text,
  translation_pl text,
  example_l2 text,
  example_pl text,
  created_at timestamp,
  unique(user_id, language, normalized_span)
)
```

### 7.4 Monthly spend cap

- Cap is **per calendar month**, TZ **Europe/Warsaw** (`SPEND_CAP_TZ`).
- Default for new users: **`spend_cap_usd = 10`**.
- Sum `usage_ledger.cost_usd` for current month vs cap. Counted: **TTS + ASR + GenAI**.
- Admin can edit cap anytime.
- **At cap:** block costly actions (start conversation, extraction, category generation, selection Translate / Add to learning, correction, shadowing start, mnemonic generate/regenerate). User **may still** browse Memo Flashcards and review FSRS. Nothing deleted. Resets next calendar month.

### 7.5 Quizlet export (`.txt`)

Accepted cards only (active language and/or category): lines `term<TAB>definition`, cards separated by newline — matches Quizlet import defaults (same as paste from Excel two-column copy). Download and/or clipboard. No Quizlet API in MVP.

### 7.6 Category generation

Onboarding interests (per language) create `flashcard_sets`, then **auto Generate first words** in background → Pending. Later “Generate new” same path → Pending Accept/Reject. Costs → ledger + Langfuse.

### 7.7 Optional CEFR plan + lessons

- Onboarding: optional placement + intensity 4/8/12/16 (Skip OK). Sets `user_language_profile.cefr_level` and creates active `study_plans` row. Skills 1–5 remain independent (no auto-map to CEFR).
- Menu → Plan: create/resume plan; open lesson slots (lazy lesson generator); progress_day / skip-day — reimplemented from specs (reference: FreeLingo semantics).
- Lesson vocabulary candidates → Pending (`source=lesson`).
- Agenda may soft-inject CEFR/unit only when a plan exists; never force lesson scripts in Chat.
- Lesson generation / placement GenAI count toward spend_cap.
- Curriculum first ship: en-GB/en-US; de/es/it schema-ready. Spec: [`superpowers/specs/2026-08-27-cefr-optional-plan-lessons-design.md`](./superpowers/specs/2026-08-27-cefr-optional-plan-lessons-design.md).
- FreeLingo reference map (not import): `.cursor/plans/2026-08-27-freelingo-keep-adapt-drop.md`.

### 7.8 In-flight correction (Package 2)

- REST `POST /api/chat/correction` (not Live tools). Auto after finalized user turn (substantive only); on-demand **Check** on user selection.
- Timing: `VOICE_MODE=speech_to_speech` → parallel with agent reply; `chained` → after STT, before LLM.
- Tip under user line (rolled): corrected L2 + type; PL explanation on expand; **Add to learning** → Pending `source=correction`.
- Cap blocks auto and Check. Spec: [`superpowers/specs/2026-08-27-inflight-correction-design.md`](./superpowers/specs/2026-08-27-inflight-correction-design.md).

### 7.9 Memo IA + Shadowing (Package 4)

- Bottom tabs: Chat / **Memo** / Menu. Memo sub-tabs: **Flashcards** | **Shadowing** | **Mnemonics**.
- Shadowing: topic → generate dialogue or pick conversation → show-text on/off + **TTS|Live** → play/repeat/feedback → end hard-line batch → Pending `shadowing`.
- `shadowing_sessions` table; costs → ledger. Spec: [`superpowers/specs/2026-08-27-shadowing-memo-design.md`](./superpowers/specs/2026-08-27-shadowing-memo-design.md).

### 7.10 Mnemonics (Package 3)

- Mnemonics tab: accepted terms without cache → Generate; Regenerate replaces (GenAI → cap).
- Due card: **Mnemonic** button → same panel/API.
- `vocab_mnemonics` cache table; no images; no user-owned. Spec: [`superpowers/specs/2026-08-27-mnemonics-design.md`](./superpowers/specs/2026-08-27-mnemonics-design.md).

## 8. Deployment

- Frontend: Vercel → **`langy.fmazurkiewicz.dev`**.
- Backend: Render Docker Free → **`api-langy.fmazurkiewicz.dev`**. Expect spin-down; Chat shows waking state; never rely on in-memory FSRS/jobs.
- Supabase: Postgres + Google OAuth + RLS; pooler URL on Render.
- Env: providers, Langfuse, `SPEND_CAP_TZ`, `ALLOWED_ADMIN_EMAILS`, `VOICE_MODE`.
- No Redis service required for MVP.

## 9. Build order (MVP)

1. Greenfield scaffold: `backend/` + `frontend/` + Supabase + Render + Vercel + Google login.
2. Schema: users, user_language_profile, usage_ledger, vocab/fsrs, RLS.
3. PWA shell (tabs, Classical, dark mode, one language switcher).
4. Onboarding: languages → per-language motivation / interests / self-assessment.
5. Provider interfaces + Langfuse wiring; OpenRouter + Gemini Live.
6. English voice E2E on real iPhone Safari; ledger + monthly cap checks.
7. Post-session extraction + accept/reject UI; agent save-word tool.
8. FSRS reviews in DB; Quizlet `.txt` export.
9. Category generation from interests.
10. Optional CEFR placement + study plan + lessons (Menu → Plan); lesson → Pending.
11. Admin spend-cap UI (monthly used vs cap).
12. promptfoo suites in CI for critical prompts.
13. Non-English voice verification (de/es/it).
14. Optional second voice provider (chained) to prove adapter boundary.
15. Coach packages: transcript selection → in-flight correction → shadowing (Memo) → mnemonics.

## 10. Known risks

- iOS Safari mic / background audio — test early.
- VAD quality — budget tuning time.
- Extraction prompt quality — promptfoo + Langfuse iteration.
- Per-language voice quality variance.
- Chained voice latency if added later.

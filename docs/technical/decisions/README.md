# ADR — Architecture Decision Records

Short dated decisions. Living detail often lives in `docs/architecture-for-cursor.md`; extract here when a decision needs a stable ID.

## 2026-08-26 — product decisions delta (recorded in architecture + UX)

- One language switcher; global effect
- Classical language markers (no emoji flags)
- Motivation + interests per language; L1 always Polish
- Vocab: accept/reject; agent_save on voice request
- Monthly spend_cap (TTS+ASR+GenAI); at cap → costly off, FSRS review on
- FSRS persisted in Postgres
- Langfuse + promptfoo
- Export `.txt` to Quizlet (outbound); inbound Quizlet still Phase 2
- Public free app; greenfield codebase (FreeLingo reference only, not fork)

## 2026-08-27 — transcript selection + dictionary (Package 1)

- Coach roadmap order: transcript+dictionary → in-flight correction → shadowing → mnemonics (no images / no user-owned mnemonics)
- In-session transcript always visible; select span → Translate | Add to learning
- Add → Pending (`transcript_selection`); Translate = PL + example sentence; Add also from translate panel
- REST + per-user `selection_lookup_cache` (not Live tools)
- Spec: `docs/superpowers/specs/2026-08-27-transcript-selection-dictionary-design.md`

## 2026-08-27 — CEFR optional plan + lessons

- CEFR A1–C2 placement + study plan 4/8/12/16 weeks **in** Langy
- Placement in onboarding **optional** (Skip); Chat without plan OK
- Lessons **optional** (Menu → Plan); not forced home
- Self-assessment 1–5 **and** CEFR kept separate (no auto-map)
- Lesson vocab → Pending `source=lesson`
- Spec: `docs/superpowers/specs/2026-08-27-cefr-optional-plan-lessons-design.md`
- Keep/adapt/drop (reference map): `.cursor/plans/2026-08-27-freelingo-keep-adapt-drop.md`

## 2026-08-27 — Greenfield; no FreeLingo fork

- Langy = own `backend/` + `frontend/` from specs; FreeLingo **reference only**
- Task 0 = greenfield MVP skeleton, not fork import
- ADR: `docs/technical/decisions/2026-08-27-greenfield-no-freelingo-fork.md`

## 2026-08-27 — in-flight correction (Package 2)

- Auto substantive tip + on-demand Check; tip + Add → Pending (`correction`)
- Live: correction parallel with agent reply; chained: after STT before LLM
- Rolled tip: corrected L2 + type; PL explanation on expand
- Cap blocks auto + Check; REST `/api/chat/correction`
- Spec: `docs/superpowers/specs/2026-08-27-inflight-correction-design.md`

## 2026-08-27 — Shadowing + Memo IA (Package 4)

- Bottom nav: Chat / **Memo** / Menu (Words → Memo)
- Memo: Flashcards + Shadowing + Mnemonics
- Shadowing: topic → generate or pick conversation; show-text; TTS|Live; tip+Add + end batch → Pending `shadowing`
- Spec: `docs/superpowers/specs/2026-08-27-shadowing-memo-design.md`

## 2026-08-28 — Centralized session gate; dev auth opt-in

- Single client-side `AuthGate` in root layout; pages never redirect for auth (routing rules unit tested in `lib/auth/routePolicy.ts`)
- Session status enum incl. `profile_unknown` — Render cold start never misroutes
- OAuth returns to `/`; gate sends new users to `/onboarding`, returning users to `/chat`
- `DEV_AUTH_ENABLED` (default false) gates `dev-token` + unsigned JWTs; ignored when `SUPABASE_URL` is set
- ADR: `docs/technical/decisions/2026-08-28-session-gate-and-dev-auth.md`

## 2026-08-27 — Mnemonics (Package 3)

- Memo sub-tabs: Flashcards · Shadowing · **Mnemonics**
- Library for accepted terms; Generate + **Regenerate** (GenAI → cap); no images / no user-owned
- Due card **Mnemonic** shortcut → same panel
- Spec: `docs/superpowers/specs/2026-08-27-mnemonics-design.md`
- Plan: `docs/superpowers/plans/2026-08-27-mnemonics.md`

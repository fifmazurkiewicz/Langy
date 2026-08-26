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
- Public free app under AGPL fork constraints

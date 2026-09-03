# Chat interests + user memory — design (2026-08-26)

## Interests ↔ Chat

- Soft only: never force a topic; user leads.
- **Opening turn:** varied phrasings of the same intent — e.g. what to talk about today / what we’re learning. **Do not** list the user’s Interests in that first question.
- Interests (and due SRS) may be used **softly** if the user is silent or says they don’t know what to talk about — as optional suggestions, still no lesson plan.

## User memory (global)

- After **End session**, the same background wave as vocab extraction (parallel or chained in one job family) also produces:
  - ** lasting facts** about the user (global, not per learning language)
  - a short **session summary** (1–3 sentences)
- Chat agenda receives: structured profile (active language) + **top facts** + **last N session summaries** — not full transcripts in the prompt (transcripts stay in DB).
- **Defaults:** inject up to **50** facts (most recent / highest salience) and **last 3** session summaries into the agenda. Store more in DB; UI can show the full editable list.
- **Menu → Memory:** user can **view, edit, and delete** facts (and see recent summaries). Edits are authoritative for future agendas.

## Cost

Fact/summary extraction counts as **GenAI** toward monthly spend cap (same as vocab extraction).

## Listening space (2026-09-03)

Mid-session and opening share the same turn-taking contract: react → develop → at most one open invite; no multi-question turns. Opening/resume line pools invite space to speak (not interview openers). Soft Interests-on-silence unchanged.

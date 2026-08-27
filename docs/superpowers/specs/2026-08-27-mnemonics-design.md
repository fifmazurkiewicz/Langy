# Design — Mnemonics library (Package 3)

**Date:** 2026-08-27  
**Status:** approved  
**Product:** Langy  
**Depends on:** Accepted vocab / FSRS cards, spend_cap, `TextCompletionProvider`  
**Roadmap:** 1 transcript → 2 correction → 4 shadowing → **3 mnemonics**

## Goal

Third Memo technique: **Mnemonics** — GenAI sound-association mnemonics in Polish (+ example sentence) for accepted flashcard terms. No images; no user-authored mnemonics. Library tab + quick access from Due review.

## Memo IA (LOCKED)

```
Memo
├── Flashcards   (Due / Categories / Pending / export)
├── Shadowing    (separate mode — Package 4)
└── Mnemonics    (association library — this package)
```

Bottom nav unchanged: **Chat / Memo / Menu**. Pending badge on Memo (Flashcards Pending count).

## Non-goals

- Image mnemonics  
- User typing/saving own mnemonics  
- Mnemonics for Pending-only terms (must be **accepted** / in FSRS)  
- Auto-generate on Accept (on demand only)  
- Fourth bottom tab  

## Content shape

For term in active language, GenAI returns:

- `association_pl` — funny/memorable Polish sound-association story (Lingo-style)  
- `example_l2` — one example sentence using the term  
- `example_pl` — Polish gloss of example  

Stored per `(user_id, language, term)`; shown in PL for association; L2 for example line.

## UX

### Mnemonics tab (library)

- List **accepted** terms for active language **without** cached mnemonic.  
- Row tap or **Generate** → loading → panel with association + example.  
- Terms with mnemonic: optional “Browse” section or filter “With mnemonic” — **Decision:** primary list = **needs mnemonic**; search can open any accepted term.  
- **Regenerate** replaces cached content (new GenAI call → ledger).  
- At cap: Generate/Regenerate blocked with same costly-action copy.

### Due card shortcut

- One button **Mnemonic** on Flashcards Due review card.  
- Opens same panel as library (generate if missing, view if cached).  
- Does not add a second data path — same cache/API.

### Not on Pending

Pending Accept/Reject has no Mnemonic button; user Accepts first.

## Architecture

**Approach A — REST + cache table**

| Action | Endpoint |
|---|---|
| List needs mnemonic | `GET /api/mnemonics/needs?language=` |
| Get or generate | `POST /api/mnemonics/generate` body `{ term, language, regenerate?: bool }` |
| Get cached | `GET /api/mnemonics/{language}/{term}` |

## Data (ADDED)

### `vocab_mnemonics`

```text
vocab_mnemonics (
  id              uuid pk,
  user_id         uuid,
  language        text,
  normalized_term text,
  vocab_item_id   uuid nullable fk vocab_items,
  association_pl  text,
  example_l2      text,
  example_pl      text,
  created_at      timestamp,
  updated_at      timestamp,
  unique(user_id, language, normalized_term)
)
```

Dedup key same as vocab: `normalize_span` + casefold for lookup.

## Given / When / Then

| Given | When | Then |
|---|---|---|
| Accepted term, under cap, no cache | Generate | 200 + stored row; GenAI → ledger |
| Cache exists, regenerate=false | Generate | 200 from cache; no GenAI |
| Cache exists, regenerate=true | Regenerate | New content; GenAI → ledger |
| At cap | Generate/Regenerate | 402 |
| Pending-only term | Generate | 404 or 400 “Accept first” |

## Spend / Langfuse

- Prompt `mnemonic_generate` in Langfuse; promptfoo fixture.  
- Generate and Regenerate count as GenAI toward monthly cap.

## Testing

- Cache hit/miss; regenerate replaces; cap 402; Due button opens same payload; list excludes terms with mnemonic.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-08-27 | Memo: Flashcards + Shadowing + Mnemonics | User |
| 2026-08-27 | Library tab + Due shortcut (same panel) | User D clarified |
| 2026-08-27 | Regenerate yes, costs cap | User |
| 2026-08-27 | Accepted only; no Pending | Quality + FSRS link |
| 2026-08-27 | No images / no user-owned | User lock |

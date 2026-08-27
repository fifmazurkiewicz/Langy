# Design — Interactive transcript + selection dictionary (Package 1)

**Date:** 2026-08-27  
**Status:** approved — implementation plan ready  

**Product:** Langy  
**Depends on:** Chat session + transcript persistence (`conversations.transcript`), Pending vocab, spend_cap, `TextCompletionProvider`

## Roadmap context (locked)

Build order for coach features (separate specs each):

1. **This package** — always-on transcript + select → Translate | Add to learning  
2. In-flight correction  
3. Shadowing  
4. Mnemonics (GenAI on demand; **no** images; **no** user-owned mnemonics)

## Goal

During an active Chat session the learner always sees the live transcript, can select one word, several words, or a whole sentence, and either:

- **Translate** — Polish meaning + one example of use in a sentence (L2 + PL), then optionally **Add to learning**; or  
- **Add to learning** — create a Pending vocab item (Accept/Reject in Memo → Flashcards).

## Non-goals (this package)

- In-flight grammar correction UI  
- Shadowing mode  
- Mnemonic generation  
- Image mnemonics / user-authored mnemonics  
- Agent Live tools for selection (REST path only)  
- Changing `agent_save` (voice “save this word” stays accepted + FSRS, not Pending)

## Architecture decision

**Approach A — FE text selection + authenticated REST**

| Action | Endpoint (illustrative) | Backend |
|---|---|---|
| Translate | `POST /api/chat/selection/translate` | Lookup cache → else GenAI → cache + ledger |
| Add to learning | `POST /api/chat/selection/pending` | GenAI translation if needed → `vocab_items` pending |

Rationale: precise multi-word selection in PWA, spend_cap checks, Langfuse, unit tests — without routing selection through Gemini Live tools.

## UX

### Transcript

- **Always visible** during an active session (replaces prior “optional / default hidden”).  
- Lines grow as turns finalize (User / Agent). Streaming partials may show but **selection applies only to finalized turn text** (stable spans).  
- Idle / pre-session: no selection UI.

### selection

- Tap one word, drag/select several consecutive tokens, or select a whole sentence/line.  
- On selection end → action sheet: **Translate** | **Add to learning** | Dismiss.  
- Empty / whitespace-only selection → no sheet.

### Translate panel

- Shows: selected span (L2), Polish translation, one example sentence in L2 + Polish gloss.  
- Secondary CTA: **Add to learning** (same Pending path as direct Add).  
- Loading + error states; retry; at spend_cap → blocked copy consistent with Chat.

### Add to learning

- Creates **one** Pending item; `term` = normalized selected span (trim, collapse internal whitespace).  
- Does **not** auto-split into multiple terms in v1.  
- Toast success; Memo Pending badge increments.  
- Dedup: if same `(user, language, term)` exists → toast “Already in your list” (no duplicate row).

### Memo → Flashcards Pending

- New source label: **Transcript** (`transcript_selection`).  
- Accept → FSRS card; Reject → as today. Never auto-expires.

## Data model (ADDED)

### `selection_lookup_cache`

```text
selection_lookup_cache (
  id                 uuid primary key,
  user_id            uuid references users,  -- per-user optional; see Decision
  language           text,                   -- active learning language
  normalized_span    text,
  translation_pl     text,
  example_l2         text,
  example_pl         text,
  created_at         timestamp,
  unique(user_id, language, normalized_span)
)
```

**Decision:** cache is **per-user** (privacy + personalization). Shared global cache is out of scope.

### `vocab_items.source` (MODIFIED)

Allowed values add: `'transcript_selection'`.

Still: `'chat_extraction' | 'agent_save' | 'category_generated' | 'transcript_selection'`.

`transcript_selection` items are created with `status = 'pending'`.

## API contracts (behavioral)

### Translate — Given / When / Then

| Given | When | Then |
|---|---|---|
| Active session, under cap, finalized selection non-empty | User taps Translate | 200: `{ span, translation_pl, example_l2, example_pl }`; GenAI cost in ledger if cache miss |
| Cache hit for `(user, language, normalized_span)` | User taps Translate | 200 from cache; **no** GenAI charge |
| At spend_cap | User taps Translate | 402/403; no GenAI |
| Unauthenticated / wrong user | Any | 401 |

### Add pending — Given / When / Then

| Given | When | Then |
|---|---|---|
| Under cap, new term | User taps Add to learning (sheet or after Translate) | Pending row; badge++; toast |
| Term already pending/accepted/rejected | Add | No new row; toast already exists (rejected may allow re-pending — **Decision:** re-pending after reject is allowed by upserting status back to `pending` with refreshed translation) |
| At spend_cap | Add | Blocked (GenAI for translation); if translation already known from cache/panel, still block if policy treats pending-create as costly — **Decision:** block Add at cap always (consistent with extraction) |

## Normalization

- Trim; Unicode NFC; collapse whitespace to single spaces.  
- Case: store term as selected (display); uniqueness compare **case-insensitive** for dedup (align with Lingo-style rule; implement as lower(term) unique or app-level check).  
**Decision:** dedup key = `(user_id, language, lower(trim(term)))`.

## Prompts (Langfuse)

- `selection_translate` — input: span, active language, L1=PL, optional surrounding sentence for context. Output JSON: translation_pl, example_l2, example_pl.  
- `selection_pending_card` — if Add without prior translate: produce translation_pl (+ optional short context_sentence).  
- promptfoo fixtures gate deploy.

## Spend / observability

- Both endpoints count as **GenAI** toward monthly cap on cache miss / card generation.  
- Langfuse traces on every GenAI call.  
- At cap: Translate and Add blocked; browsing transcript + FSRS review still allowed.

## Error handling

- GenAI timeout/fail → panel error, no partial Pending row.  
- Network fail → retry CTA.  
- Selection lost (turn replaced) → dismiss sheet.

## Testing

- Unit: normalization + dedup.  
- API: cache hit skips ledger GenAI; miss writes ledger; cap blocks.  
- UX (later): selection sheet actions; Pending source label.

## Open follow-ups (later packages)

- Package 2 may highlight corrected spans in the same transcript.  
- Package 3 mnemonics attach to Pending/Due term panel, not this sheet.  
- Package 4 shadowing is a separate surface.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-08-27 | Build order 1→2→4→3 | User choice |
| 2026-08-27 | Transcript always on in session | User (was optional/hidden) |
| 2026-08-27 | Sheet: Translate \| Add; Add → Pending | Explicit learner choice + quality gate |
| 2026-08-27 | After Translate, Add still available | Continuity |
| 2026-08-27 | REST + cache, not Live tools | Selection UX + metering |
| 2026-08-27 | Per-user lookup cache | Privacy |
| 2026-08-27 | No auto-split of multi-word span | Predictable one Pending row |
| 2026-08-27 | Rejected term may return to pending on Add | Learner intent overrides prior reject |
| 2026-08-27 | No images / no user-owned mnemonics (roadmap) | User lock for later package |

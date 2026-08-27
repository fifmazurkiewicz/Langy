# Design — In-flight correction (Package 2)

**Date:** 2026-08-27  
**Status:** approved  
**Product:** Langy  
**Depends on:** Package 1 transcript (always-visible lines, selection sheet patterns), spend_cap, `TextCompletionProvider`, Chat turn finalization  
**Roadmap:** 1 transcript → **2 correction** → 4 shadowing → 3 mnemonics

## Goal

After each finalized user utterance, optionally show a **substantive** correction tip under that transcript line (ignore punctuation/case-only diffs). User may also select their own line/span and run **Check**. Tip is rolled: corrected L2 + type visible; Polish explanation expands on tap; **Add to learning** → Pending.

## Non-goals

- Mistakes / sentence-review queue (Lingo-style)  
- Shadowing, mnemonics  
- Changing agent reply content to include the tip (separate UI on transcript)  
- Live-tool-only correction path  
- Auto-splitting corrections into multiple Pending terms  

## Architecture

**Approach A — single REST endpoint** `POST /api/chat/correction`

Orchestration differs by `VOICE_MODE`:

| Mode | When to call |
|---|---|
| `speech_to_speech` (Live) | After user turn text is finalized — **in parallel** with agent reply (do not block speech) |
| `chained` | After STT text ready — **before** LLM reply generation |

On-demand **Check** always hits the same endpoint (full analysis even if auto returned no tip).

## Locked decisions

| Topic | Choice |
|---|---|
| Triggers | Auto after user turn (substantive only) **+** select → Check |
| After tip | Tip + optional Add → Pending |
| Timing | Live parallel; chained after STT before LLM |
| Tip UI | Rolled: corrected L2 + type; PL explanation on expand |
| Cap | Block auto and Check (402) |
| Transport | REST, not Live tools |

## UX

### Auto tip

- Appears under the **user** transcript line when `isCorrected=true`.  
- If only punct/case/whitespace differs → `isCorrected=false`, no tip.  
- Loading: subtle inline indicator; failure: silent skip for auto (no toast spam); Check shows retry error.

### Check

- User selects own utterance (word / span / whole line) → action includes **Check** (alongside Package 1 Translate | Add when selection is from user line; agent lines: no Check).  
- Always runs full correction analysis.

### Tip content (rolled)

- Collapsed: corrected sentence/span (L2) + type chip (`Grammar` | `Word choice` | `Pronunciation`).  
- Expanded: short explanation in **Polish**.  
- CTA: **Add to learning** → one Pending row (`term` = corrected span or original+corrected policy below).

### Add to learning

- `source=correction`, `status=pending`.  
- `term` = corrected L2 text (normalized); `translation` = PL gloss via GenAI or short derived from explanation; `context_sentence` = original user utterance.  
- Dedup same as Package 1 (`user`, `language`, `lower(term)`); rejected may reopen to pending.  
- At cap: Add blocked like Package 1.

## API

### Request

```text
POST /api/chat/correction
{
  "text": "<user span or full utterance>",
  "language": "en-GB",
  "conversation_id": "<uuid>|null",
  "turn_id": "<id>|null",
  "mode": "auto" | "check",
  "context_before": "<optional>",
  "context_after": "<optional>"
}
```

### Response

```text
{
  "is_corrected": bool,
  "corrected_text": "<L2>|null",
  "explanation_pl": "<string>|null",
  "mistake_type": "Grammar"|"Word choice"|"Pronunciation"|null,
  "original_text": "<normalized input>"
}
```

| Given | When | Then |
|---|---|---|
| Under cap, substantive error | auto or check | 200, `is_corrected=true`, tip fields set; GenAI → ledger |
| Under cap, punct/case only | auto or check | 200, `is_corrected=false`; still may charge GenAI (model judged) — **Decision:** charge on every call; client hides tip when false |
| At cap | auto or check | 402; no GenAI |
| Unauthenticated | any | 401 |

## Data

- Persist last correction JSON on the user turn / message row when available (`correction` jsonb nullable) for reload of transcript tip.  
- Pending: `vocab_items.source` adds `'correction'`.

## Prompts (Langfuse)

- `turn_correction` — input: text, language, L1=PL, optional context. Output JSON matching response fields. Instruct: ignore punctuation/case-only; explanation in Polish; mistake_type enum.  
- promptfoo fixture gates deploy.

## Spend / observability

- Every successful GenAI correction call → ledger + Langfuse.  
- Cap blocks auto scheduling and Check UI with same costly-action messaging as Chat.

## Error handling

- Auto timeout/fail → no tip, conversation continues.  
- Check fail → panel error + retry.  
- Race: tip attaches by `turn_id`; stale tips discarded if turn replaced.

## Testing

- Unit: punct/case → client treats as no tip when API returns false.  
- API: 402 at cap; 200 shapes; ledger on GenAI.  
- Orchestration: chained invokes correction before LLM mock; Live does not await correction before starting reply.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-08-27 | Auto substantive + on-demand Check | User D+C |
| 2026-08-27 | Tip + Add → Pending | User B |
| 2026-08-27 | Live parallel; chained STT→correction→LLM | User D |
| 2026-08-27 | Rolled tip; PL explanation | User D |
| 2026-08-27 | Cap blocks auto + Check | User A |
| 2026-08-27 | REST Approach A | Metering + one path |
| 2026-08-27 | `source=correction` for Pending | Distinct from transcript_selection |
| 2026-08-27 | Charge GenAI even when is_corrected=false | Honest metering; UI hides tip |

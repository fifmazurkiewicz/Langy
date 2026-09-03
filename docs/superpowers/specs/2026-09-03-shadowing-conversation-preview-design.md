# Design — Shadowing past-conversation message preview

**Date:** 2026-09-03  
**Status:** approved  
**Product:** Langy  
**Depends on:** Shadowing Memo flow, `parse_transcript`

## Goal

When picking a past chat for Shadowing, let the user recognize the conversation by expanding an accordion that shows a scrollable preview of recent messages (not only a single truncated `preview` string).

## Non-goals

- Full transcript viewer / Resume Chat from Shadowing  
- Changing setup (show-text / TTS|Live)  
- New detail endpoint  

## UX (LOCKED)

| State | Behavior |
|---|---|
| Collapsed | One-line `preview` (+ optional date if already shown) |
| Tap card | Select **and** expand; at most **one** card expanded |
| Expanded | Scrollable list of up to **10 last** parsed lines (`User` / `Agent`) |
| Empty | “No messages to preview” |
| Continue | Enabled when a conversation is selected |

Approach: **A** — accordion on the list (not chevron-only, not bottom sheet).

## API (ADDED)

`GET /api/shadowing/conversations` each item gains:

```json
{
  "id": "<uuid>",
  "language": "en-GB",
  "started_at": "...",
  "preview": "...",
  "snippet_lines": [{ "role": "User"|"Agent", "text": "..." }]
}
```

- `snippet_lines` = last ≤10 lines from `parse_transcript(transcript)`  
- Keep existing `preview` for collapsed row  
- No extra round-trip  

## Given / When / Then

| Given | When | Then |
|---|---|---|
| Ended conversation with many lines | List conversations | Item includes last 10 as `snippet_lines` |
| Conversation with fewer than 10 lines | List | All lines returned |
| Empty transcript | List | `snippet_lines: []` |
| User on Past chat step | Taps a card | Card selected + expanded; previous expansion closes |
| User taps Continue with selection | — | Setup step as today |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-03 | Accordion + select on same tap | Fewer clicks on mobile |
| 2026-09-03 | Last ~10 lines, scrollable | Recognition without full chat |
| 2026-09-03 | Snippets on list endpoint | Avoid N+1 detail fetches |

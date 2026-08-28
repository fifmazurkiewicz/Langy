# Chat modern UI + conversation history — design (2026-08-28)

## Summary

Modernize the Chat screen to match the Classical voice-first mock (`ChatScreen.dc.html`) and add conversation history with **read-only preview** and **resume** (reopen same `conversation_id`).

## Decisions

| Topic | Decision | Why |
|-------|----------|-----|
| UI layout | Voice-first hero: orb + status + scrollable transcript + sticky control bar | Matches UX mock; separates primary (voice) from secondary (transcript) |
| Transcript style | Plain lines, no `User:`/`Agent:` prefixes; agent muted, user normal | Readable conversation, not debug log |
| History entry | Clock/list icon in Chat header → bottom sheet | No 4th bottom-nav tab; history is secondary |
| Resume | Reopen: `ended_at = null`, append Agent welcome-back line | Continuous transcript; no schema change |
| Active session conflict | Prompt: end current session first | Avoid two live sessions |
| Post-session on re-end | Run jobs again; vocab dedup by existing unique key | Reuse current pipeline |

## Requirements (GWT)

### Modern UI

- **Given** no active session, **When** user opens Chat, **Then** they see Agent orb, “Ready when you are”, and a Start session CTA.
- **Given** an active session, **When** lines are added, **Then** transcript auto-scrolls and shows plain role-styled lines.
- **Given** user ends session, **When** post-session completes, **Then** a summary sheet appears (not `alert()`).

### History list

- **Given** past sessions for active language, **When** user opens History, **Then** they see up to 20 items with date, preview, optional summary, Active badge if not ended.
- **Given** a list item, **When** user taps it, **Then** full transcript opens read-only with Continue (if ended) or Return to session (if active).

### Resume

- **Given** a ended session, **When** user taps Continue, **Then** transcript loads, Agent sends welcome-back, listening is off, user can toggle mic.
- **Given** an active session elsewhere, **When** user tries Continue another, **Then** they are prompted to end current session first.

## API

### `GET /api/chat/conversations?language=`

Response:

```json
{
  "conversations": [
    {
      "id": "uuid",
      "language": "en-GB",
      "started_at": "ISO",
      "ended_at": "ISO | null",
      "preview": "first 120 chars",
      "summary": "optional one-liner",
      "is_active": false
    }
  ]
}
```

### `POST /api/chat/sessions/{id}/resume`

- Clears `ended_at`, appends Agent welcome line.
- Returns `{ conversation_id, language, lines[], resumed: true }`.
- 400 if still active; 402 spend cap.

### Existing

- `GET /api/chat/sessions/{id}` — full transcript
- `POST /api/chat/sessions`, `/lines`, `/end` — unchanged contract

## Frontend components

| Component | Role |
|-----------|------|
| `AgentPresence` | Breathing orb SVG by chat state |
| `ChatStage` | Hero layout: presence + status + transcript slot |
| `ChatStatus` | Title + subtitle from state map |
| `ChatControlBar` | Sticky listening toggle + End session |
| `TranscriptLine` | Single styled line + inline correction |
| `HistorySheet` | Conversation list |
| `ConversationDetailSheet` | Read-only transcript + Continue |
| `SessionSummarySheet` | Post-end feedback |
| `EndSessionSheet` | Confirm end / end-before-resume |
| `ClassicalBottomSheet` | Shared bottom sheet primitive |
| `frontend/src/lib/api/chat.ts` | Chat API client |

## Out of scope (later)

- History pagination, search, delete
- Check correction on old transcript lines in read-only view
- Desktop split layout

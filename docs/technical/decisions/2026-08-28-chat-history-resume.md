# ADR: Chat history + resume (2026-08-28)

## Status

Accepted

## Context

Users need to browse past voice chat sessions and continue a conversation later. Transcripts are stored as plain text on `conversations.transcript`; post-session jobs already create summaries and vocab extraction.

## Decision

1. **History UI** — History button in Chat header → bottom sheet list → detail sheet with full transcript.
2. **Resume** — Reopen same row: set `ended_at = NULL`, append Agent welcome-back line. No new table or forked conversation ID.
3. **Modern Chat UI** — Voice-first layout (Agent orb, status, scrollable plain transcript, sticky control bar) per Classical mock.

## Consequences

- `GET /api/chat/conversations` lists up to 20 sessions per user (optional `language` filter).
- `POST /api/chat/sessions/{id}/resume` reopens ended sessions; spend cap applies.
- Second `End session` after resume runs post-session jobs again; vocab dedup unchanged (`uq_vocab_term`).
- Active session conflict: user must end current session before resuming another.

## API

See `docs/superpowers/specs/2026-08-28-chat-modern-history-design.md`.

---
name: 2026-08-26 chat-interests-memory
overview: Soft Interests in Chat + global user memory (facts/summaries) with Menu CRUD.
todos:
  - id: design
    content: Write chat-interests-memory design spec
    status: completed
  - id: sync
    content: Sync architecture + UX
    status: completed
---

# Plan — Chat interests + memory (2026-08-26)

## Decisions

| Topic | Choice |
|---|---|
| Interests in Chat | Soft only |
| Opening | Varied “what to talk about / learn?”; no Interests listed |
| Soft Interests | Only if silent / unsure |
| Memory | Facts + last session summaries |
| Scope | Global per user |
| Timing | Post End, with vocab extraction job wave |
| UI | Menu → Memory: edit + delete |
| Agenda limits | 50 facts, 3 summaries (defaults) |

## Artifacts

- `docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md`
- Updated `docs/architecture-for-cursor.md`, UX spec/decisions, README

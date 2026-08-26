---
name: 2026-08-26 domain-user-journey
overview: Domain review decisions for user journey; synced into architecture, UX, and design spec.
todos:
  - id: review-qs
    content: Clarify Pending, End session, generate, cap, PL, export
    status: completed
  - id: design-doc
    content: Write docs/superpowers/specs/2026-08-26-domain-user-journey-design.md
    status: completed
  - id: sync-docs
    content: Sync architecture + UX + decisions
    status: completed
---

# Plan — domain user journey (2026-08-26)

## Decisions

| Decision | Choice |
|---|---|
| Accept/Reject location | Shared Words **Pending** (not end-of-chat) |
| End session | Explicit CTA only |
| Extraction timing | Async after End; Chat → Idle |
| Empty extraction | Toast only |
| Category seed / Generate | Auto after onboarding; both → Pending |
| Pending UI | One queue + source; Words **badge**; never expires |
| Default spend_cap | **$10**/month |
| Active language | Explicit pick at end of onboarding |
| Polish mid-chat | Only on explicit user request |
| Quizlet export | `term\\tdefinition` + newline |

## Artifacts

- `docs/superpowers/specs/2026-08-26-domain-user-journey-design.md`
- Updated `docs/architecture-for-cursor.md`, `docs/ux/ux-ui-spec.md`, `docs/ux/ux-ui-decisions.md`

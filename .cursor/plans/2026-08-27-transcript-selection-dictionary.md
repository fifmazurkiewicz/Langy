---
name: 2026-08-27 transcript selection dictionary
overview: Package 1 — always-on transcript, select span → Translate | Add to Pending; cache + REST. Part of coach roadmap 1→2→4→3.
todos:
  - id: design-doc
    content: Write and review Package 1 design spec
    status: completed
  - id: user-review
    content: User approves written spec
    status: completed
  - id: writing-plans
    content: Implementation plan after spec approval
    status: completed
  - id: execute-package-1
    content: Execute Package 1 plan (after greenfield Chat/Memo gate)
    status: pending
  - id: packages-2-4-3
    content: Specs for correction, shadowing, mnemonics (after Package 1)
    status: pending
---

# Plan — transcript selection + dictionary (2026-08-27)

## Decisions

| Decision | Choice |
|---|---|
| Coach build order | 1 transcript+dict → 2 correction → 4 shadowing → 3 mnemonics |
| Mnemonics later | GenAI only; no images; no user-owned |
| Transcript visibility | Always on during active session |
| Selection actions | Translate \| Add to learning |
| Add destination | Pending (`transcript_selection`) |
| After Translate | Add still available |
| Architecture | FE selection + REST + per-user cache |
| Auto-split span | No (one Pending row) |
| Cap @ Translate | Block with 402 (no GenAI); simplest costly-action rule |

## Artifacts

- Spec: `docs/superpowers/specs/2026-08-27-transcript-selection-dictionary-design.md`
- Implementation plan: `docs/superpowers/plans/2026-08-27-transcript-selection-dictionary.md`
- Delta: `docs/architecture-for-cursor.md`, `docs/ux/ux-ui-spec.md`, `docs/technical/decisions/README.md`

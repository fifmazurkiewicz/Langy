---
name: 2026-08-27 inflight correction
overview: Package 2 — auto substantive correction + Check; REST; tip+Add→Pending; Live parallel / chained STT→correction→LLM.
todos:
  - id: design
    content: Write Package 2 design spec + doc deltas
    status: completed
  - id: user-review
    content: User reviews written spec
    status: completed
  - id: writing-plans
    content: Implementation plan after spec approval
    status: completed
---

# Plan — in-flight correction (2026-08-27)

## Decisions

| Decision | Choice |
|---|---|
| Triggers | Auto (substantive) + Check |
| After tip | Add → Pending `correction` |
| Timing | Live parallel; chained after STT before LLM |
| Tip | Rolled; PL explanation |
| Cap | Block auto + Check |
| Architecture | REST Approach A |

## Artifacts

- Spec: `docs/superpowers/specs/2026-08-27-inflight-correction-design.md`
- Working notes: `.cursor/plans/2026-08-27-inflight-correction.md`
- Delta: architecture, UX, ADR

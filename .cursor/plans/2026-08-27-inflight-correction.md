# Package 2 — in-flight correction (working notes)

## Locked

| Decision | Choice |
|---|---|
| Auto after user turn | Yes — only **substantive** errors (ignore punctuation / case-only) |
| On demand | Yes — select own utterance → **Check** (always runs full check even if auto said “clean”) |
| After showing tip | Tip + optional **Add to learning** → Pending (no Mistakes queue in this package) |
| Timing vs agent reply | **Live:** parallel with agent reply · **Chained:** after STT, before LLM |
| Tip shape | Corrected L2 + type visible; **PL explanation rolled/collapsed** — expand on tap (D) |
| Spend cap | Block **auto and Check** (same as other GenAI costly actions) |
| Architecture | REST `POST /api/chat/correction` (Approach A) |
| Pending source | `correction` |

## Open

_(none)_

## Spec

`docs/superpowers/specs/2026-08-27-inflight-correction-design.md`

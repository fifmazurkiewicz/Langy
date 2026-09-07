# ADR — Constitution hygiene in-repo

**Date:** 2026-09-07  
**Status:** accepted

## Context

Global Cursor rules required Graft, Superpowers, spec-driven docs, Taste, and English replies. Langy already had most project copies, but Taste/language rules, Taste dials, `configuration.md`, secret scanning, and correct Dependabot paths were missing. Graft wiring existed without a local graph.

## Decision

- Commit `taste-skill.mdc`, `language.mdc`, and `taste-skill-dials.mdc` (VARIANCE 3 / MOTION 2 / DENSITY 6) under `.cursor/rules/`.
- Document environment **names** in `docs/technical/configuration.md`; never commit secret values.
- Dependabot: npm in `frontend/` and `backend/`, pip in `backend/`, GitHub Actions at `/`.
- CI: Gitleaks secret scan (pinned image + allowlist for env templates / empty `*_API_KEY=` placeholders); Python 3.12 aligned with the Render image; Node 22 for frontend/promptfoo (Supabase JS `engines.node >= 22`).
- Nested `backend/AGENTS.md` and a Langy section in `frontend/AGENTS.md`. Graft `/graft/` remains gitignored.

## Consequences

Agents cloning only this repo get the full constitution. Taste SKILL.md stays global and uncommitted. Graft MCP still needs Cursor to start the server from `.cursor/mcp.json`.

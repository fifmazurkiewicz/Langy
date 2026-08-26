---
name: 2026-08-26 docs-ux-hygiene
overview: Organize root UX/architecture files into docs/; add repo hygiene and Graft wiring.
todos:
  - id: move-docs
    content: Move architecture + UX into docs/
    status: completed
  - id: hygiene
    content: gitignore, cursorignore, AGENTS, project rules, env.example
    status: completed
  - id: graft
    content: Wire Graft for Cursor (init + build)
    status: cancelled
  - id: path-fixups
    content: Fix cross-references after move
    status: completed
---

# Plan — docs layout + hygiene (2026-08-26)

## Goal

Root-folder UX/UI and architecture artifacts become a durable `docs/` contract; project rules and Graft match agent-workflow / documentation-first.

## Decisions

| Decision | Why |
|---|---|
| `docs/architecture-for-cursor.md` = business **and** technical | User: this file is the project description for both layers |
| UX under `docs/ux/` (spec, decisions, screens, DS) | Spec-driven; screens stay with the UX contract (`_ds` next to HTML for relative paths) |
| Project `.cursor/rules/` copies of global constitution | Repo-local SoT for agents in this workspace |
| Graft wiring committed; `graft build` blocked on this machine | Missing VS C++ / node-gyp for tree-sitter native deps; MCP + rule present |

## Graft note (2026-08-26)

`npx/@nanonets/graft` install fails on Windows without Visual Studio "Desktop development with C++". Manual wiring done: `.cursor/rules/graft.mdc`, `.cursor/mcp.json`, `/graft/` in `.gitignore`. Re-run `graft init --agents cursor` + `graft build` after build tools are available.

## Delta

- **ADDED:** `docs/**`, `AGENTS.md`, `README.md`, `.gitignore`, `.cursorignore`, `.env.example`, `.cursor/rules/*`, `.cursor/mcp.json`, `.github/dependabot.yml`, plan
- **MOVED:** root UX/architecture → `docs/`
- **REMOVED:** empty `uploads/`, `_ds/` after move

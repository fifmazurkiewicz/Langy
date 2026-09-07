# Constitution hygiene (2026-09-07)

Close gaps vs agent-workflow bootstrap: in-repo Taste/language rules, Taste dials, env name catalog, Dependabot paths, secret scan, nested AGENTS, local Graft graph.

## Decisions

- **2026-09-07** — Copy `taste-skill.mdc` and `language.mdc` into `.cursor/rules/` so the repo is self-contained without global Cursor rules.
- **2026-09-07** — Langy Taste overlay: VARIANCE 3 / MOTION 2 / DENSITY 6 (PWA tool, not marketing baseline).
- **2026-09-07** — Env names live in `docs/technical/configuration.md` (placeholders only; no secret values).
- **2026-09-07** — Dependabot tracks `frontend/` npm, `backend/` npm, `backend/` pip, and root GitHub Actions.
- **2026-09-07** — CI runs Gitleaks on push/PR; Python 3.12 to match Dockerfile / local-setup.
- **2026-09-07** — Graft cache stays gitignored; build locally with `npx -y @nanonets/graft`.

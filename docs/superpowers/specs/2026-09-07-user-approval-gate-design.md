# User approval gate — Langy

**Date:** 2026-09-07  
**Status:** approved  
**Shared contract:** TeacherHelper `docs/superpowers/specs/2026-09-07-user-approval-gate-design.md` (copy the product table from there; do not fork a second policy).

## Langy mapping

| Shared rule | Langy |
|---|---|
| `/me` ungated | `GET /api/auth/me` returns `is_approved` |
| Extra read for SPA | `GET /api/profile/languages` stays on `get_current_user` |
| Feature 403 | `require_approved` / `get_approved_user` on chat, voice, vocab, shadowing, plan, memory, jobs, onboarding mutations, profile writes, admin |
| $10 grant | Existing `spend_cap_usd` default 10 (Europe/Warsaw). Accept does not overwrite it. |
| Waiting UI | `AuthGate` after a valid session; Polish copy; poll `/api/auth/me` every 15s |
| Admin | `GET /api/admin/users` includes `is_approved`; `PATCH /api/admin/users/{id}` `{is_approved}`; hide self-revoke |
| Migration | `supabase/migrations/010_user_is_approved.sql` + SQLAlchemy `User.is_approved` |

No email notifications in v1.

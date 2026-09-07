# User approval gate (Langy)

**Date:** 2026-09-07  
**Status:** implementing  
**Shared contract:** TeacherHelper `docs/superpowers/specs/2026-09-07-user-approval-gate-design.md`

## Goal

Public signup stays. New users log in and see one waiting screen until an admin Accepts. Revoke uses the same screen (`is_approved` boolean). Existing rows grandfathered. Allowlist emails auto-approved on **insert only**. Accept does not overwrite `spend_cap_usd` (default 10 USD/month, Europe/Warsaw).

## Langy mapping

| Contract | Langy |
|---|---|
| `/me` stays ungated | `GET /api/auth/me` + `GET /api/profile/languages` on `get_current_user` |
| Feature 403 | `get_approved_user` / `require_approved` |
| Admin | `GET /api/admin/users` includes `is_approved`; `PATCH /api/admin/users/{id}` `{is_approved}`; no self-revoke |
| Waiting UI | `AuthGate` after session; no chat/menu chrome |
| Migration | `supabase/migrations/010_user_is_approved.sql` + SQLAlchemy column |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-07 | Copy shared product contract; Langy spend cap already defaults to 10 | No second quota system |
| 2026-09-07 | `GET /api/profile/languages` stays on `get_current_user` | SPA can read profile; mutations still gated |
| 2026-09-07 | Local `dev-token` is admin at insert, so auto-approved | Existing local admin backdoor; production rejects `dev-token` |

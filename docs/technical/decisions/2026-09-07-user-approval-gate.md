# ADR — User approval gate

**Date:** 2026-09-07  
**Status:** accepted

## Context

Langy is linked from the public portfolio. Google OAuth signup is open. A new row in `users` previously got the $10 monthly `spend_cap_usd` and full product access on first JWT.

Shared product contract (all landing apps): TeacherHelper `docs/superpowers/specs/2026-09-07-user-approval-gate-design.md`.

## Decision

- Add `users.is_approved` (boolean, default false). Existing rows are grandfathered `true` (`supabase/migrations/010_user_is_approved.sql`).
- `get_current_user` still creates the profile. `is_approved=true` only on **insert** when `is_admin` (allowlist, or local `dev-token`). Later requests never flip the flag, so revoke sticks.
- Feature routes use `get_approved_user` / `require_approved`. `GET /api/auth/me` and `GET /api/profile/languages` stay on `get_current_user`. Health stays open.
- Unapproved feature calls return **403** `{ "detail": { "code": "account_pending_approval", "message": "…" } }`.
- Admin `PATCH /api/admin/users/{id}` toggles `is_approved` and does not overwrite `spend_cap_usd`. An admin cannot revoke themselves.
- SPA `AuthGate` shows one waiting screen (no chat/menu chrome) until approved.

## Consequences

- Public registration stays; spend starts after Accept.
- Apply migration 010 on Supabase before or with the Render deploy so existing learners are not locked out.

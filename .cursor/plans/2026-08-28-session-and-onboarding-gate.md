# Session management + onboarding gate

Date: 2026-08-28
Scope: MODIFIED — frontend auth/routing, backend token verification. No schema change.

## Problem

Reported: "Something about the session — session management is still broken. After login there must be
onboarding. A new user sees chat immediately."

## Root causes (confirmed in code, not hypotheses)

| # | Root cause | Evidence |
|---|---|---|
| RC1 | OAuth lands on `/chat`, which has no gate | `AuthProvider.signInWithGoogle` → `redirectTo: ${SITE_URL}/chat`; `app/chat/page.tsx` has no onboarding check |
| RC2 | Only `app/page.tsx` gates onboarding; `/chat`, `/memo`, `/menu/*`, `/plan` are ungated | direct navigation works for a never-onboarded user |
| RC3 | `onboardingCompleted: boolean` conflates "not completed" with "unknown" | initialized `false`; `applyMe()` swallows failures in `catch {}`; Render Free cold start 30–60 s |
| RC4 | Every page redirects independently in its own `useEffect` | `page.tsx`, `login/page.tsx`, `onboarding/page.tsx` → races, flash of wrong screen, contradictory redirects |
| RC5 | `getAccessToken()` returns `null` while auth is still initializing | `tokenRef.current` is null before the init effect resolves → user sees "Could not verify your session" although signed in |
| RC6 | `useLearningLanguage` fabricates `"en-GB"` + status `"ready"` on error | masks `needs_setup`, so Chat looks usable without a profile |
| RC7 | **Critical security**: `dev-token` accepted unconditionally in production | verified live: `GET https://api-langy.../api/auth/me` with `Authorization: Bearer dev-token` → `200 {"is_admin": true}` |

RC7 also promotes the caller to admin (`deps.get_current_user` sets `is_admin = True` for `dev-token`), and
`tokens.decode_access_token` falls back to `jwt.decode(..., verify_signature=False)` when no Supabase config
is present.

## Requirements (Given / When / Then)

1. **New user reaches onboarding.**
   Given a user with `onboarding_completed_at = null`,
   When they finish Google OAuth,
   Then they land on `/onboarding` and cannot reach `/chat`, `/memo`, `/menu/*` or `/plan` until it is completed.

2. **Returning user skips onboarding.**
   Given `onboarding_completed_at` is set,
   When they open `/` or `/login` while signed in,
   Then they land on `/chat` without seeing the onboarding wizard.

3. **Cold start never misroutes.**
   Given the user is signed in but `/api/auth/me` has not succeeded yet (Render cold start),
   When the gate evaluates,
   Then it shows a waking/loading state and redirects nowhere until the profile status is known.

4. **No spurious session errors.**
   Given the user is signed in and auth initialization is still in flight,
   When a page requests a token,
   Then `getAccessToken()` awaits initialization and returns the real token instead of `null`.

5. **Anonymous user is bounced to login.**
   Given no Supabase session,
   When they open any protected route,
   Then they are redirected to `/login`.

6. **`dev-token` is rejected in production.**
   Given `SUPABASE_URL` is configured (or dev auth is not explicitly enabled),
   When a request carries `Authorization: Bearer dev-token`,
   Then the API responds `401` and no admin user is created or promoted.

7. **Unsigned JWTs are rejected in production.**
   Given no dev-auth opt-in,
   When a token cannot be verified against JWKS or the HS256 secret,
   Then the API responds `401` (never decodes with `verify_signature=False`).

## Decisions

- **2026-08-28 — Route gating lives in a single client component `<AuthGate>` in the root layout, not in Next.js
  middleware.** Why: onboarding status comes from the Render backend, not from the Supabase cookie. Calling Render
  from edge middleware would put a 30–60 s cold start in front of every navigation, and all pages are currently
  statically prerendered. Middleware could only answer "has a cookie", which does not satisfy requirement 1.
- **2026-08-28 — Session state becomes an explicit status enum**
  (`initializing | anonymous | profile_unknown | needs_onboarding | ready`) replacing the
  `loading` + `onboardingCompleted` boolean pair. Why: RC3 — a boolean cannot express "I do not know yet",
  which is exactly the cold-start case that caused the misroutes.
- **2026-08-28 — OAuth `redirectTo` becomes the app root `/` built from `window.location.origin`.** Why: RC1 —
  the gate, not the OAuth provider, decides the destination. `window.location.origin` also removes the
  `http://localhost:3000` fallback that would break production if `NEXT_PUBLIC_SITE_URL` were unset.
- **2026-08-28 — Dev auth becomes an explicit backend opt-in `DEV_AUTH_ENABLED` (default `false`), and is
  ignored whenever `SUPABASE_URL` is set.** Why: RC7 — the current behavior is a full authentication bypass with
  admin rights on a public production API.
- **2026-08-28 — `/api/auth/me` stays the single bootstrap call** (it already returns `onboarding_completed_at`,
  `active_language`, spend cap and admin flag). No new endpoint. Why: avoids a second cold-start round trip.

## Tasks

- [x] T1 — Backend: red tests for `dev-token` rejection + unsigned-JWT rejection, then `DEV_AUTH_ENABLED` gate.
      `backend/tests/auth/test_dev_auth_gate.py` (5 tests), `config.dev_auth_allowed`, `tokens.py`, `deps.py`.
      Route tests opt in via `backend/tests/conftest.py`.
- [x] T2 — `AuthProvider`: status enum; `getAccessToken` reads `supabase.auth.getSession()` directly instead of
      React state (no init race); `applyMe` distinguishes `profile_unknown` / `needs_onboarding` / `ready` and
      dedupes per token so a cold start costs one request.
- [x] T3 — `lib/auth/routePolicy.ts` (pure, 8 vitest cases) + `components/AuthGate.tsx`, mounted in root layout.
- [x] T4 — Per-page redirects removed (`page.tsx`, `login/page.tsx`, `onboarding/page.tsx`, `menu/page.tsx`
      sign-out); OAuth `redirectTo` → `${window.location.origin}/`.
- [x] T5 — `useLearningLanguage`: fabricated `en-GB` fallback removed, `error` status added and surfaced in Chat;
      the "needs setup" link now points at `/menu/languages` (`/onboarding` would be bounced back by the gate).
- [x] T6 — Verified: `python -m pytest` 66 passed, `npm test` 8 passed, `npm run lint` clean, `npm run build` OK.
      Production smoke pending deploy.

Also added because docs referenced a missing file: `frontend/.env.example`, plus `npm test` wired into CI.

## Follow-ups (not in this change)

- Rotate nothing: no secret was exposed, but the `dev-token` bypass means any traffic before this fix could have
  written data as the dev user. Worth reviewing `users` for id `00000000-0000-4000-8000-000000000001`.
- `frontend/.env.example` is missing although `deployment-standard.mdc` requires it.

# 2026-08-28 — Centralized session gate; dev auth becomes an explicit opt-in

Status: accepted

## Context

Signed-in users saw session errors, and users who had never onboarded landed directly in Chat.
Investigation found four structural causes rather than one bug:

- OAuth `redirectTo` pointed at `/chat`, and `/chat` had no onboarding check. Only `app/page.tsx` gated
  onboarding, so any direct navigation bypassed the wizard.
- `loading` + `onboardingCompleted` booleans could not express "the API has not answered yet". Because
  `/api/auth/me` failures were swallowed, a Render cold start (30–60 s on Free) looked identical to
  "user is not onboarded", and routing decisions were made on unknown state.
- Three pages redirected independently inside their own `useEffect`, racing each other.
- `getAccessToken()` returned `null` while the provider was still initializing, surfacing as
  "Could not verify your session" to users who were in fact signed in.

Separately, the production API accepted `Authorization: Bearer dev-token` unconditionally and returned
`is_admin: true`, and `decode_access_token` fell back to `jwt.decode(..., verify_signature=False)` when
no Supabase configuration was present. Verified live against `api-langy.fmazurkiewicz.dev` before the fix.

## Decision

1. **One client-side gate.** `frontend/src/components/AuthGate.tsx`, mounted in the root layout, is the only
   place that redirects for auth reasons. Pages render content and never gate themselves. The routing rules
   live in the pure function `resolveRedirect` (`frontend/src/lib/auth/routePolicy.ts`) and are unit tested.
2. **Not Next.js middleware.** Onboarding status comes from the Render backend, not from the Supabase cookie.
   Edge middleware would put a cold start in front of every navigation and would only be able to answer
   "is there a cookie", which does not satisfy the onboarding requirement. All routes stay static.
3. **Explicit session status.** `AuthProvider` exposes
   `initializing | anonymous | profile_unknown | needs_onboarding | ready`. `profile_unknown` is the cold-start
   state and never triggers a redirect — the gate shows "Waking up the API…" with a retry instead.
4. **`getAccessToken()` reads Supabase storage directly** (`supabase.auth.getSession()`), so it no longer
   depends on React state having settled and cannot return a spurious `null`.
5. **OAuth returns to `/`**, built from `window.location.origin`; the gate decides onboarding vs chat. This also
   removes the `http://localhost:3000` fallback that would break production if `NEXT_PUBLIC_SITE_URL` were unset.
6. **Dev auth is an explicit backend opt-in.** New setting `DEV_AUTH_ENABLED` (default `false`); `dev-token` and
   unsigned JWTs are accepted only when it is true **and** `SUPABASE_URL` is empty. Production, which sets
   `SUPABASE_URL` for JWKS, therefore rejects them even if the flag were mistakenly enabled.
7. **`useLearningLanguage` no longer fabricates `en-GB`** on failure; it reports an `error` status so Chat can
   say what happened instead of pretending a profile exists.

## Consequences

- Local development without Supabase now requires `DEV_AUTH_ENABLED=true` in `backend/.env`. Without it the API
  returns 401 for `dev-token`, which is the intended production behavior.
- A user who is onboarded but has deleted every language is `ready` + `needs_setup`; Chat links to
  `/menu/languages` (not `/onboarding`, which the gate would bounce straight back).
- Any data written before this change through the `dev-token` bypass belongs to user
  `00000000-0000-4000-8000-000000000001` and is worth reviewing.

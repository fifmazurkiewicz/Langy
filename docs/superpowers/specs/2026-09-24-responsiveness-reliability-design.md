# Responsiveness and Reliability Design

## Goal

Make Langy feel responsive during routine API work while clearly recovering from failures, without adding infrastructure or dependencies.

## Scope

This design covers seven related optimizations:

1. Cache successful cross-origin CORS preflight responses for 24 hours.
2. Retain the database as the only source for the Admin users list; do not introduce an external account-directory fallback.
3. Render newly created client entities immediately from their POST responses, then perform non-blocking reconciliation only when server-derived aggregate values are needed.
4. Keep API response payloads normalized: UUIDs as strings, Numeric values as floats, timestamps as ISO-8601 strings or null, and nullable model columns represented as nullable DTO fields.
5. Replace silent empty states after request failures with readable errors and a retry action.
6. Preserve independently scrollable mobile content in locked app-shell layouts, using dynamic viewport units and safe-area offsets where a viewport-constrained component is required.
7. Queue post-session extraction and summarization rather than running provider calls inside the end-session HTTP request.

## Architecture

The FastAPI app remains the owner of CORS policy and job persistence. `CORSMiddleware` receives `max_age=86_400`. The existing Postgres-backed `jobs` table remains the queue. `POST /api/chat/sessions/{conversation_id}/end` marks the conversation ended and enqueues one `post_session` job, then returns its ID without calling the provider.

The existing admin-only `POST /api/chat/jobs/process-pending` endpoint remains the explicit runner for pending post-session jobs. This change does not add a worker, Redis, or an automatic scheduler; production may invoke that existing endpoint through the already-authorized deployment scheduler when one is configured. A queued job survives route changes, browser refreshes, and Render request lifecycle completion.

Client pages keep their existing local React state. The Memo category creation path inserts the category returned by the API into `categories` immediately with known initial aggregate values (`accepted_count: 0`, `due_count: 0`, `is_custom: true`). It then optionally reconciles with the list endpoint without blocking navigation or rendering. Chat session creation already establishes its local session state from the POST response and remains unchanged.

## Error and Loading Behavior

The Admin page has distinct `loading` and `error` state. A failed initial fetch shows a readable error plus Retry rather than rendering an empty user list. Save and approval actions show their errors rather than failing silently; successful mutations update the matching local user from the returned DTO, avoiding a mandatory list refetch.

Memo has a shared reload operation that owns loading/error state. Initial category/pending fetches and due-card fetches both transition to error on failure and offer Retry. Existing data remains visible where available; no request failure is represented as "nothing due" or an empty category list.

## Response Normalization

Admin response construction remains the normalization boundary. The public admin-user DTO permits `email` and `display_name` to be null, converts IDs to strings, and converts money values from `Decimal`/Numeric values to JSON numbers before comparison and serialization. Endpoint response models should be added where they prevent accidental data leakage or response-shape drift, without rewriting unrelated routes.

## Mobile Layout

The locked Chat screen retains `h-dvh` and a dedicated `overflow-y-auto` transcript pane. Bottom sheets remain internally scrollable and retain bottom safe-area spacing. Their height limits change from static `vh` to dynamic viewport units so browser chrome changes cannot hide the privacy-consent action.

## Testing

- Backend: assert a preflight response includes `access-control-max-age: 86400`.
- Backend: assert ending a session creates a pending job and does not call `process_post_session_job`.
- Frontend: test failed Admin and Memo loads expose error text and retry controls.
- Frontend: test a successfully created category is displayed before reconciliation completes.
- Existing API tests continue to assert normalized Admin user values, including null fields and numeric spend amounts.

## Non-goals

- No new queue service, Redis, Celery, or dependency.
- No full browser reloads or route reloads to refresh data.
- No automatic client polling for queued post-session work.
- No external identity-provider fallback for the Admin users page.

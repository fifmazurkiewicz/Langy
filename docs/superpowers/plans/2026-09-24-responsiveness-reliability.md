# Responsiveness and Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make routine API interactions faster, immediately responsive, and recoverable after failures without adding infrastructure.

**Architecture:** FastAPI owns a one-day CORS preflight policy and keeps post-session work durable in the existing Postgres `jobs` table. The client keeps its current local React-state approach: mutations patch known returned objects immediately and independent fetches expose explicit errors and retries.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, Next.js 16, React 19, Tailwind CSS, pytest, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-responsiveness-reliability-design.md`

## Global Constraints

- Do not add Redis, Celery, a queue package, or a new frontend dependency.
- Preserve the database as the only Admin-user source; never call the Supabase Admin API from the list route.
- Serialize UUIDs as strings, Numeric money values as floats, timestamps as ISO-8601 strings or null, and preserve nullable DTO fields.
- Do not use a browser or route reload as data refresh.
- Keep mobile viewport-constrained UI scrollable, with `dvh` and safe-area padding where used.
- Ending a chat must enqueue, not execute, post-session provider work.

## Review Focus

- A browser preflight with authenticated headers returns the configured max-age while retaining credentialed CORS behavior.
- An Admin API outage is visibly different from a valid empty user list and Retry performs a fresh request.
- A newly created custom category renders at once even if category reconciliation is slow or fails.
- A due-card fetch failure does not present stale or empty data as “Nothing due.”
- Ending a chat returns after durable enqueueing even if the text provider would be slow or unavailable.

---

### Task 1: CORS policy and deferred post-session jobs

**Files:**
- Modify: `backend/app/main.py:11-17`
- Modify: `backend/app/api/routes/chat.py:219-235`
- Test: `backend/tests/api/test_cors_and_jobs.py`

**Interfaces:**
- Consumes: `enqueue_post_session_jobs(db, conversation_id, user_id) -> Job`
- Produces: `POST /api/chat/sessions/{conversation_id}/end` returns `{"ok": true, "job_id": "<uuid>"}` without calling `process_post_session_job`.

- [ ] **Step 1: Write the failing CORS test**

```python
def test_preflight_caches_for_one_day():
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.headers["access-control-max-age"] == "86400"
```

- [ ] **Step 2: Write the failing end-session test**

```python
def test_end_session_only_enqueues_post_session_job():
    with patch("app.api.routes.chat.process_post_session_job") as process:
        response = client.post(f"/api/chat/sessions/{conversation.id}/end")
    assert response.status_code == 200
    assert response.json()["job_id"]
    process.assert_not_called()
```

- [ ] **Step 3: Run the focused tests to verify they fail**

Run: `cd backend && python -m pytest tests/api/test_cors_and_jobs.py -v`

Expected: the CORS assertion fails because `max_age` is not set; the job assertion fails because the route calls the processor.

- [ ] **Step 4: Implement the minimal backend changes**

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86_400,
)

# backend/app/api/routes/chat.py
job = enqueue_post_session_jobs(db, conversation.id, user.id)
return {"ok": True, "job_id": str(job.id)}
```

- [ ] **Step 5: Run the focused tests and then the backend suite**

Run: `cd backend && python -m pytest tests/api/test_cors_and_jobs.py -v && python -m pytest`

Expected: PASS.

- [ ] **Step 6: Commit the task**

```bash
git add backend/app/main.py backend/app/api/routes/chat.py backend/tests/api/test_cors_and_jobs.py
git commit -m "fix: defer post-session processing"
```

### Task 2: Immediate mutation state and recoverable Admin/Memo requests

**Files:**
- Modify: `frontend/src/app/menu/admin/page.tsx:8-36`
- Modify: `frontend/src/app/memo/page.tsx:55-160`
- Modify: `frontend/src/lib/memo/categories.ts:1-29`
- Modify: `frontend/src/components/chat/ClassicalBottomSheet.tsx:16-34`
- Test: `frontend/src/lib/memo/categories.test.ts`

**Interfaces:**
- Consumes: `createCategory(token, { language, category_key }) -> Promise<{ id: string; category_key: string }>` and `setUserApproval(...) -> Promise<AdminUser>`.
- Produces: local `CategoryItem` insertion and UI states named `loading`/`error` or equivalent with an accessible Retry control.

- [ ] **Step 1: Write the failing pure-data test for immediate category insertion**

Add `makeCreatedCategory` to `frontend/src/lib/memo/categories.ts`, with this exact API:

```ts
export type MemoCategory = {
  id: string;
  category_key: string;
  accepted_count: number;
  due_count: number;
  is_custom: boolean;
};

export function makeCreatedCategory(created: Pick<MemoCategory, "id" | "category_key">): MemoCategory;
```

Write this test in `frontend/src/lib/memo/categories.test.ts`:

```ts
expect(makeCreatedCategory({ id: "c1", category_key: "travel" })).toEqual({
  id: "c1", category_key: "travel", accepted_count: 0, due_count: 0, is_custom: true,
});
```

- [ ] **Step 2: Run the focused frontend test to verify it fails**

Run: `cd frontend && npm test -- src/lib/memo/categories.test.ts`

Expected: FAIL because the insertion helper/behavior does not exist.

- [ ] **Step 3: Implement immediate category insertion and soft reconciliation**

```ts
const created = await createCategory(token, { language: activeLanguage, category_key });
setCategories((current) => [
  ...current,
  makeCreatedCategory(created),
]);
setNewCategoryName("");
void reload();
```

Keep a failed reconciliation non-destructive: it must not remove the new category or block rendering.

- [ ] **Step 4: Implement explicit Admin request states and local mutation patches**

```ts
const [loadError, setLoadError] = useState<string | null>(null);
// initial list failure: setLoadError(message), never setUsers([]) as the error signal
// Retry button: onClick={() => void refresh()}
const updated = await setUserApproval(token, id, isApproved);
setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
```

Apply the same local patch to the fields returned by `updateSpendCap`, leaving the current list untouched because this response includes the changed monetary values. Show action errors via the existing `notify` utility.

- [ ] **Step 5: Implement Memo request errors and retry controls**

Use one `reload` function that sets `categoriesLoading` and `categoriesError`, catches both initial and due-card requests, and renders a Retry button beside the error. Preserve already-loaded lists on failure. Do not label a failed due request as `Nothing due`.

- [ ] **Step 6: Use dynamic viewport height in the bottom sheet**

```tsx
className="classical-card max-h-[85dvh] overflow-hidden rounded-t-md border-b-0 shadow-lg"
...
<div className="max-h-[60dvh] overflow-y-auto p-4">{children}</div>
```

Keep the existing bottom safe-area padding and footer outside the scrollable content so the consent action remains reachable.

- [ ] **Step 7: Run focused test, lint, and production build**

Run: `cd frontend && npm test -- src/lib/memo/categories.test.ts && npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 8: Commit the task**

```bash
git add frontend/src/app/menu/admin/page.tsx frontend/src/app/memo/page.tsx frontend/src/lib/memo/categories.ts frontend/src/components/chat/ClassicalBottomSheet.tsx frontend/src/lib/memo/categories.test.ts
git commit -m "fix: recoverable responsive client updates"
```

### Task 3: Verify normalized Admin DTOs and queued-job runner semantics

**Files:**
- Modify: `backend/tests/auth/test_user_approval.py:139-193`
- Test: `backend/tests/api/test_cors_and_jobs.py`

**Interfaces:**
- Consumes: `_user_item(db, user) -> dict`.
- Produces: a JSON-safe Admin user payload with nullable identity values and numeric monetary values.

- [ ] **Step 1: Add DTO normalization coverage**

```python
assert item == {
    "id": str(pending.id),
    "email": None,
    "display_name": None,
    "spend_cap_usd": 10.0,
    "monthly_spend_usd": 0.0,
    "at_cap": False,
    "is_approved": False,
}
```

- [ ] **Step 2: Run the focused normalization and job tests**

Run: `cd backend && python -m pytest tests/auth/test_user_approval.py tests/api/test_cors_and_jobs.py -v`

Expected: PASS with the existing response shape.

- [ ] **Step 3: Verify the queued-job runner still processes a pending job only when explicitly invoked**

```python
response = client.post("/api/chat/jobs/process-pending")
assert response.status_code == 200
process.assert_called_once()
```

- [ ] **Step 4: Run the complete verification suite**

Run: `cd backend && python -m pytest && cd ../frontend && npm test && npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add backend/tests/auth/test_user_approval.py backend/tests/api/test_cors_and_jobs.py
git commit -m "test: cover normalized queued API responses"
```

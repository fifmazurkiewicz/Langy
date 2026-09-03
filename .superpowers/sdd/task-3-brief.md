### Task 3: Docs + AGENTS delta

**Files:**
- Modify: `docs/architecture-for-cursor.md` (section 7.1 Session Agenda + opening)
- Modify: `docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md`
- Modify: `AGENTS.md` (Learned User Preferences)
- Reference: `docs/superpowers/specs/2026-09-03-tutor-listening-space-design.md` (already written)

**Interfaces:**
- Produces: durable docs matching the prompt contract (no code API change)

- [ ] **Step 1: Architecture Â§7.1 delta**

In `docs/architecture-for-cursor.md`, under **Opening:** (after the existing Interests soft rule), add:

```markdown
**Listening space:** Every tutor turn (including opening) should (1) briefly react to the learnerâ€™s intention, (2) develop the topic with statements/examples, (3) use at most one open invitation â€” never stack multiple questions. Prefer giving the learner room to speak.
```

- [ ] **Step 2: Chat interests-memory design delta**

Append to `docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md`:

```markdown
## Listening space (2026-09-03)

Mid-session and opening share the same turn-taking contract: react â†’ develop â†’ at most one open invite; no multi-question turns. Opening/resume line pools invite space to speak (not interview openers). Soft Interests-on-silence unchanged.
```

- [ ] **Step 3: AGENTS.md preference**

Under Learned User Preferences, add a bullet:

```markdown
- Tutor turns: react to intent, develop with statements, at most one open invitation; never stack questions; opening/resume lines leave space to speak.
```

- [ ] **Step 4: Full backend pytest smoke**

```bash
cd backend && python -m pytest
```

Expected: PASS (or pre-existing failures unrelated â€” do not expand scope).

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add docs/architecture-for-cursor.md docs/superpowers/specs/2026-08-26-chat-interests-memory-design.md AGENTS.md
git commit -m "docs: tutor listening-space contract in architecture and AGENTS"
```

---

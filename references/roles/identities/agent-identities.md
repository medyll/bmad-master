# Agent Identities & Inter-Agent Communication

## Inter-Agent Communication: bmad-openspace.md

**Purpose:** When multiple roles work on the same project, they use `./bmad/bmad-openspace.md` (at project root) to coordinate and avoid collisions.

**Agent Identity:** Each role picks a **unique name** from its role's name pool (`agent-names.md` in this folder). This ensures clear identification when multiple roles of the same type work concurrently.

**Format:**
```markdown
# OpenSpace — <project-name>

## [Role - Name] — YYYY-MM-DD HH:mm
<remark, question, decision, or coordination note>

## [Developer - Léo] — 2026-04-04 18:30
Starting work on S3-02. Will modify `/src/components/Modal.svelte`. If anyone else touches this file, please coordinate.

## [Tester - Mathis] — 2026-04-04 18:45
E2E tests failing on Modal.svelte — waiting for Developer fix before continuing.
```

**Rules:**
1. **Append-only** — never delete or edit previous entries
2. **Sign every entry** with `[Role - Name] — timestamp` (e.g., `[Developer - Léo] — 2026-04-04 18:30`)
3. **Read before acting** — each role must read bmad/bmad-openspace.md at the start of their turn
4. **Write when:**
   - Starting work on a file that might conflict with another role
   - Blocking another role (e.g., tests waiting for fix)
   - Making a decision that affects other roles
   - Asking a question for the next role
5. **Location:** `./bmad/bmad-openspace.md` at project root (create if missing)
6. **Optional to write** — if no coordination needed, skip writing. But always read.

**Integration:** At the start of each role activation (Step 1 of Role Activation Checklist), after reading `status.yaml`, also read `./bmad/bmad-openspace.md` if it exists. Note any relevant remarks for your current task.

---

## Name Selection

See `agent-names.md` in this folder for the name pool system. Each role has 8 unique names (French, English, Spanish). Pick an unused name for your session.

Names in use are tracked in the current session context.

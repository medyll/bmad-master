# BMAD – Inter-Role Discussion Protocol

Discussions happen **automatically** — no command required. Any role that detects a cross-role dependency, conflict, or decision blocker must open a discussion thread before proceeding.

---

## Automatic Triggers

A role opens a discussion when:
- Its output will directly constrain another role's work
- It detects a contradiction with another role's existing artifact
- It cannot proceed without an explicit decision from a peer role
- No-Entropy Principle challenges a design or architectural choice

A role does **not** open a discussion for unilateral decisions within its own scope.

---

## How It Works

1. Role A detects a coordination need.
2. Role A creates `bmad/artifacts/discussions/disc-{ID}-{YYYY-MM-DD}.md` and writes the opening turn.
3. The Orchestrator surfaces it in the next response, inline, as a collapsible thread.
4. Relevant roles respond in subsequent turns within the same session.
5. Thread closes with a **Decision** line. Role A continues.

---

## Thread Format

```markdown
# DISC-{ID} – {Short subject}
**Date:** {YYYY-MM-DD}
**Participants:** {Role A}, {Role B}
**Status:** open | resolved | deferred

---

[{Role A}] → [{Role B}]: {One sentence. Factual.}

[{Role B}] → [{Role A}]: {One sentence.}

[{Role A}] → [{Role B}]: {Resolution.}

---
**Decision:** {One sentence outcome.}
**Unblocks:** {artifact or command that can now proceed}
```

### Rules
- **Max 3 turns.** Unresolved after 3 → `deferred`, escalated at next `bmad status`.
- **One sentence per turn.** No filler.
- `[Role] → [Role]:` prefix is mandatory.
- Thread always ends with **Decision** + **Unblocks**.
- IDs are sequential: `DISC-001`, `DISC-002`, …

---

## Example

```markdown
# DISC-001 – Auth module layer ownership
**Date:** 2026-03-02
**Participants:** Architect, Developer
**Status:** resolved

---

[Architect] → [Developer]: JWT refresh belongs in the gateway layer — ST-012 references the wrong layer.

[Developer] → [Architect]: Understood; should I refactor ST-012 inline or create a dedicated migration story?

[Architect] → [Developer]: Create ST-020 for the migration; keep ST-012 focused.

---
**Decision:** Auth refresh moves to gateway; ST-020 created for migration.
**Unblocks:** `bmad sprint story ST-020`
```

---

## `status.yaml` Append

```yaml
discussions:
  - id: "DISC-001"
    date: "2026-03-02"
    participants: ["Architect", "Developer"]
    subject: "Auth module layer ownership"
    status: "resolved"
    decision: "Auth refresh moves to gateway; ST-020 created."
    artifact: "bmad/artifacts/discussions/disc-001-2026-03-02.md"
```

Update `status.yaml` after appending.


# BMAD Command Reference (Detailed)

## Orchestrator Commands

### `bmad analyze`
Take over an ongoing project.
1. Analyze code, file structure, documentation.
2. Identify tech stack and current dev phase.
3. Generate `bmad/` folder structure from what exists.
4. Update `status.yaml` to reflect actual state.
5. Suggest the immediate `bmad next` step.

### `bmad sync`
Update BMAD project structure when skills/roles/templates evolve or artifacts are missing.
1. Detect changes.
2. Update `config.yaml`, `status.yaml`, and folders — apply automatically without prompting.

### `bmad init`
Initialize a new project. Infer name, stack, and scope from `package.json`, README, or folder name. Ask only if critical info is **completely absent** — in a single grouped question. Then create:

```
bmad/
├── config.yaml
├── status.yaml
├── artifacts/
│   ├── product-brief.md
│   ├── prd.md
│   ├── tech-spec.md
│   ├── architecture.md
│   ├── sprints/
│   └── stories/
├── references/
└── docs/
```

**Baseline Audit** (if existing source code detected):
1. Run `bmad audit --full` (see `references/analyst-audit.md`).
2. Store as `bmad/artifacts/audit-baseline-{YYYY-MM-DD}.md`.
3. Set `status.yaml.audit.baseline: true`.
4. Surface Critical findings with suggested `bmad dev story` commands.
If no code → set `audit.baseline: pending` in `status.yaml`.

### `bmad status`
Display project status and recommend next proactive move:
```
📋 BMAD Project Status
─────────────────────────────────
Phase 1 – Analysis      ✅ Done
Phase 2 – Planning      ⚠️  In progress
  └─ PRD                ❌ Missing  → run: bmad plan prd
Phase 3 – Solutioning   ⏳ Upcoming
─────────────────────────────────
👉 Next: bmad plan prd
```

### `bmad next [--auto]`
Execute the next logical step based on current project state and best practices.

**Without flag** — execute the single most logical next step, then stop.

**With `--auto`** — enter **full autonomous mode** for the current category (writing stories, sprints, docs, etc.):
- Identify the active phase/category and **keep working within it** (e.g., if you just created a story, continue implementing every pending story before moving on).
- Do not ask questions about what to do; if you have a doubt, make the more logical choice based on project state and best practices.
- Execute **every pending task** in that category sequentially without pausing, asking, or waiting.
- Apply sensible defaults for all decisions that are not destructive or irreversible.
- Only halt if: (a) a test fails, (b) a file write fails, (c) a decision requires information that cannot be inferred.
- After each completed task, emit one status line: `[role...] ✅ done: <task> → next: <task>`.
- When the category is fully exhausted: emit a summary table and update `status.yaml`.

**Autonomous decision rules** (applied only under `--auto`):

| Decision type | Default behavior |
|---------------|-----------------|
| Missing PRD context | Use existing artifacts; flag gap in summary |
| Story estimate unknown | Default to 3 points |
| Ambiguous scope | Take the narrower interpretation; note it |
| Test framework unknown | Infer from `package.json` devDependencies |
| Commit message scope | Infer from changed file paths |
| Architecture choice between equals | Choose the option with fewer dependencies |

**`--auto` never:**
- Deletes files or drops database schema.
- Commits with failing tests.
- Overwrites an artifact marked `locked: true` in `status.yaml`.

*Example: `bmad next --auto` during Sprint 2 → generates all missing dev-stories, runs tests, commits each story, updates `status.yaml` — zero interruptions. When operating inside "story" work it continues authoring and implementing every ready story until the sprint backlog for that category is fully consumed before moving to the next category.*

---

## General Principles

- **Always check project state** before any recommendation.
- **Assume the role** matching the command.
- **Issue Auto-Route**: When an issue or bug is reported to the Orchestrator, immediately route to Developer with `bmad dev story <issue>` — the Developer will run regression tests before any fix.
- **Autonomous Chaining**: Chain tasks without asking for confirmation. Ask only when a decision is genuinely ambiguous, irreversible, or requires human judgment — batch all open questions into one message. **Never end a step with "Run /next to continue"** — always execute immediately.
- **Status Output**: Before any action, emit one short line: `[role-name...] action description`. One line max.
- **No Emphasis**: No useless praise. Stay grounded.
- **Concise**: Mydde prefers short, categorized answers.

---

## Error Handling

| Situation         | Response                                          |
| ----------------- | ------------------------------------------------- |
| No `bmad/` folder | Suggest `bmad init` or `bmad analyze`             |
| Invalid YAML      | Show error + corrected template                   |
| Unknown command   | List commands from Command Reference table        |
| Missing artifact  | Name the artifact + command to generate it        |

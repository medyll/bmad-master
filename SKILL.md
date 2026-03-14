---
name: bmad-master
description: |-
  Simple project orchestrator for managing development workflows.
  Use for: creating project structure, planning work, tracking progress, writing docs, running tests, auditing code.
  Triggers: "what's next?", "create sprint", "make roadmap", "audit code", "help plan", "write spec", "generate README".
  Commands: [init] [analyze] [status] [next] [plan] [sprint] [dev] [test] [audit] [doc] [readme] [fix]
argument-hint: "init, analyze, status, next, next --auto, plan prd, plan spec, plan arch, sprint, sprint story, dev story, dev review, test unit, test e2e, audit, audit --code, doc, readme, fix"
compatibility:
  - mcp_v2
user-invocable: true
disable-model-invocation: false
license: MIT
metadata:
  version: "4.0.0"
  release: "v4.0.0 – Simplified Edition"
  author: medyll
---

# BMAD – Simple Project Orchestrator

## Core Behavior

**This skill does ONE thing:** Read `bmad/status.yaml` and tell you what to do next.

If no `bmad/` folder exists, suggest creating one with `bmad init`.

---

## Commands (All That Exist)

### 1. `bmad init`
Create project folder structure. Creates `bmad/` with:
- `status.yaml` (tracks project phase and progress)
- `artifacts/` (stores all output files)
- `config.yaml` (project settings)

### 2. `bmad analyze`
Analyze existing project. Generates `status.yaml` based on current code.

### 3. `bmad status`
Read and display `status.yaml`. Shows: current phase, progress, next recommended action.

### 4. `bmad next [--auto]`
Execute the next logical step from `status.yaml`.

**Without `--auto`:** Do one task, stop, ask for confirmation.

**With `--auto`:** Keep doing tasks in the current category until done. No confirmations.

### 5. `bmad plan <type>`
Create a plan document. Types: `prd`, `spec`, `arch`.

Output: `bmad/artifacts/plan-{type}.md`

### 6. `bmad sprint`
Create sprint. Output: `bmad/artifacts/sprint-{date}.md`

### 7. `bmad sprint story`
Add story to current sprint.

### 8. `bmad dev story <id>`
Implement a story. Output: code changes, test updates, and update/create `README.md` summarizing the story and produced artifacts.

### 9. `bmad dev review`
Review code changes. Output: feedback + fixes.

### 10. `bmad test <type>`
Run tests. Types: `unit`, `e2e`.

### 11. `bmad audit [--code]`
Audit codebase for issues. Output: `bmad/artifacts/audit-{date}.md`

### 12. `bmad doc`
Generate documentation. Output: `bmad/artifacts/docs/`

### 13. `bmad readme`
Generate a README template for the project. The skill maintains a combined template file at `references/readme-template.md` which contains three progressive sections in the same document — `Simple`, `Intermediate`, and `Advanced`. Templates are bundled in `references/readme-templates/`; the skill can compose them into the single canonical `references/readme-template.md`. Use `bmad readme --fill` to ask the skill to analyze the project (scan `package.json`, `requirements.txt`, `src/`, `tests/`) and produce a filled draft at `bmad/artifacts/docs/README.draft.md`. The `--level` flag is a preference but the draft includes all three sections.

### 14. `bmad fix [--syntax]`
Fix issues in code.

---

## How It Works

1. **Check for `bmad/` folder** in current directory or parent.
2. **If found:** Read `bmad/status.yaml` → extract current phase, progress, next action.
3. **Print status line:** `[orchestrator] resuming: <project> | phase: <phase> | next: <action>`
4. **Execute command** (the one the user asked for).
5. **Done.** No extra logic, no role routing, no ghost logic.

---

## Flags

- `--auto`: Run continuously without stopping (until done or error).
- `--delay <seconds>`: Wait N seconds between actions (for rate-limiting).

---

## Output Files

All outputs go to `bmad/artifacts/` or subdirectories.

Examples:
- `bmad/artifacts/prd.md` (from `plan prd`)
- `bmad/artifacts/sprint-2026-03-12.md` (from `sprint`)
- `bmad/artifacts/stories/story-1.md` (from `sprint story`)
- `README.md` (updated after each story to summarize work and artifacts)

---

## What This Skill Is NOT

- ❌ Does NOT invent tools or functions
- ❌ Does NOT pretend to create files it doesn't really create
- ❌ Does NOT guess what to do if the command is unclear
- ❌ Does NOT route to multiple "roles" — it just reads status.yaml and acts
- ❌ Does NOT require reading other reference files

---

## What This Skill DOES

- ✅ Reads real files from disk
- ✅ Executes real commands (or writes real artifacts)
- ✅ Updates status.yaml when major milestones are reached
- ✅ Suggests the next logical step based on current project state
- ✅ Stops if something fails (no hallucinations)

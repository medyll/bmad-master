---
name: bmad-master
description: |-
  Project orchestrator for managing development workflows end-to-end.
  Use for: creating project structure, planning work, tracking progress, writing docs, running tests, auditing code, organizing sprints and stories.
  Triggers: "what's next?", "create sprint", "make roadmap", "audit code", "help plan", "write spec", "generate README", "organize my project", "what should I work on", "project management", "track progress", "backlog", "prioritize tasks", "set up project", "dev workflow", "project status", "start new project".
  Use this skill whenever the user mentions project orchestration, task tracking, sprint planning, story management, or wants to structure their development workflow — even if they don't say "bmad" explicitly.
  Commands: [init] [analyze] [status] [continue] [plan] [sprint] [dev] [test] [audit] [doc] [readme] [fix]
argument-hint: "init, analyze, status, continue, plan prd, plan spec, plan arch, sprint, sprint story, dev story, dev review, test unit, test e2e, audit, audit --code, doc, readme, readme --fill, fix"
compatibility:
  - mcp_v2
user-invocable: true
disable-model-invocation: false
license: MIT
metadata:
  version: "4.3.0"
  release: "v4.3.0 – Chain Protocol"
  author: medyll
---

# BMAD – Project Orchestrator

## Core Behavior

**Use as Orchestrator:** Read `bmad/status.yaml` → understand project state → execute task with appropriate role → update status → chain to next action automatically. No waiting for user input between steps. The YAML file is the state machine; follow it.

**Assumption-first approach:** Read `status.yaml` and project context. If ambiguous, make a reasonable assumption (document it with `> Assumed:`), execute, show what you did. This is faster than asking. Only ask if you truly cannot infer the intent from available context (rare).

Action guarantee: every model command must produce measurable progress. When ambiguity exists, choose a reasonable course of action, execute it, and record the assumption with `> Assumed:`. Measurable progress means at least one of the following occurred during the command:
- `bmad/status.yaml` was updated (`active_role` or `progress`)
- A new or updated artifact was written to `bmad/artifacts/`
- A code/test change was created in the workspace
- A deterministic script was run and its real output captured in artifacts/logs

If no `bmad/` folder exists, run `bmad init` immediately — do not ask the user to describe their project first. If no command is given (e.g. user says  "help me" or "What is to do now ?"), run `node scripts/engine.mjs status` and show the result

---

## Chain Protocol

**After every model command, you MUST chain to the next action automatically.** This is not optional. It is the default behavior. Productivity first.

Format your response like this every time:

```
[DONE: <what you just completed>]
[NEXT: <next_action from status.yaml>]
--- executing ---
```

Then immediately execute the next action without pausing. Only stop if:
- The user explicitly wrote "stop", "pause", or "wait"
- A **hard blocker** occurs (missing required file, command fails unrecoverably, data loss risk)

Note: End-to-end (`e2e`) test failures are not considered hard blockers by default. Treat e2e failures as soft blockers: report failures clearly and include them in `bmad/artifacts/` test reports, but continue the Chain Protocol unless the failure signals an unrecoverable environment issue (for example, missing test runner, infrastructure down, or persistent permission/credential errors). Only then should the chain stop as a hard blocker.

Action-first rules (no stalling on proposals):
- When executing a model command, pick a single, concrete recommended action and execute it immediately. Do not present multiple alternative proposals as a substitute for action.
- You may include optional alternatives in the artifact or report, but they must not block the chosen action or the Chain Protocol.
- Always update `bmad/status.yaml` after taking action to record progress and the chosen next step.

**Why this works:** The chain is driven by `status.yaml`. After each task, update `next_action` in `status.yaml`, then read it back and act. The file is the single source of truth — not memory, not conversation history.

**For small models especially:** The instruction is simple. When you finish a task, print `[DONE: X]`, print `[NEXT: Y]`, then do Y. No questions. No confirmation. Just do it.

---

## Instructions


### Model Instructions Shorthands (AI-executed)

These instructions are interpreted and executed by the skill. The skill reads `status.yaml`, understands the project context, and produces the appropriate action.
It loads the corresponding role, execute the task, then update `status.yaml` with new progress/phase/next_action.

| Instruction | What it does | Output |
|---------|-------------|--------|
| `bmad plan` | Display a plan document. Types: `prd`, `spec`, `arch` | `bmad/artifacts/plan-{type}.md` |
| `bmad plan <type>` | Create a plan document. Types: `prd`, `spec`, `arch` | `bmad/artifacts/plan-{type}.md` |
| `bmad sprint` | Create a sprint from backlog/plan | `bmad/artifacts/sprint-{date}.md` |
| `bmad sprint story` | Add a story to current sprint | `bmad/artifacts/stories/{id}.md` |
| `bmad continue` | Implement the active story (code + tests) in full | Code changes + updated `README.md` |
| `bmad dev story <id>` | Implement a story (code + tests) | Code changes + updated `README.md` |
| `bmad dev review` | Review code changes | Feedback + fixes |
| `bmad test <type>` | Run tests. Types: `unit`, `e2e` | Test results (e2e failures reported but non-blocking) |
| `bmad audit [--code]` | Audit codebase for issues | `bmad/artifacts/audit-{date}.md` |
| `bmad readme` | Generate or update the project documentation | `README.md` |
| `bmad fix [--syntax]` | Fix issues in code | Code changes |

---

## Commands

### Script Commands (deterministic)

| Command | What it does |
|---------|-------------|
| `bmad init` | Create `bmad/` with `status.yaml`, `config.yaml`, `artifacts/` |
| `bmad analyze` | Scan project, generate `status.yaml` from existing code |
| `bmad status` | Scan project, update `status.yaml` if needed and display `status.yaml` |
| `bmad snapshot` | Save timestamped copy of `status.yaml` to `artifacts/history/` |
| `bmad connector` | Generate `artifacts/connector.yml` manifest |
| `bmad config set <key> <val>` | Set a skill reference override |
| `bmad config get [key]` | Show current overrides |
| `bmad config unset <key>` | Remove an override |
---

## Roles

Each model command has a corresponding **role** — a contextual lens that shapes how the model approaches the task. Role files are in `references/roles/` and must be read before executing model commands.

| Role | File | Commands |
|------|------|----------|
| **PM** | `references/roles/pm.md` | `plan prd`, `plan spec` |
| **Architect** | `references/roles/architect.md` | `plan arch`, `analyze` |
| **Developer** | `references/roles/dev.md` | `dev story`, `fix` , `continue` |
| **Reviewer** | `references/roles/reviewer.md` | `dev review`, `audit` |
| **Tester** | `references/roles/tester.md` | `test unit`, `test e2e` |
| **Scrum Master** | `references/roles/scrum.md` | `sprint`, `sprint story`, `next`, `status` |
| **Designer** | `references/roles/designer.md` | `doc` (UI docs), component design, CSS/HTML tasks |

`readme` has no role — use project context directly.

### Role Activation Checklist

Follow these steps **in order** every time you execute a model command:

1. **Read `bmad/status.yaml`** — get current phase, progress, next_action, next_command, next_role
2. **Check `references/overrides.json`** — if the file exists, read it. If not, skip to step 3.
   - If `role.<name>.prompt` exists for this role: note it (you'll prepend it in step 4)
   - If `role.<name>.ref` exists: note the file path (you'll read it **in addition to** the role file)
3. **Read the role file** from `references/roles/<name>.md`
4. **If overrides were found in step 2:**
   - Prepend `role.<name>.prompt` text before the role instructions
   - Read the file at `role.<name>.ref` as additional context
5. **Print role tag:** First line of response must be **[PM]**, **[Architect]**, **[Developer]**, **[Reviewer]**, **[Tester]**, **[Scrum Master]**, or **[Designer]**
6. **Execute the command** following the role's perspective, priorities, and output format. Perform at least one concrete action (see "Action guarantee" above) before producing non-actionable proposals.
7. **Update `bmad/status.yaml` (CRITICAL for Chain Protocol):**
   - `active_role` = current role
   - `next_action` = human-readable description
   - `next_command` = executable command (must match next_role)
   - `next_role` = which role executes next (must match next_command)
   - `progress` when work meaningfully advances
   - **Validation:** Ensure `next_command` and `next_role` are in sync (see Validation Rules table above). Inconsistency breaks the chain.

### Roles Autonomy Rule

**Roles execute tasks, not conduct interviews.** When you have context (status.yaml + role file + project state), decide and act. Document assumptions with `> Assumed:` at the top of your response.

**When to ask vs. decide:**
- **Decide alone** if: project context is available, decision is about implementation details, or the user gave direction earlier
- **Ask only if** you cannot possibly infer the next step from available context (rare — status.yaml usually makes it clear)

**End of task:** Always follow [DONE:]/[NEXT:] format. Chain to the next action — this is not optional.

---

## status.yaml Schema

Models must read and update this file. **Complete schema with validation rules: see `references/status-yaml-validation.md`**

**Key fields to manage:**
- `next_action` — human-readable description of next step
- `next_command` — executable command (e.g. "bmad continue", "bmad sprint")
- `next_role` — who executes next (must match next_command) **[CRITICAL: must stay in sync]**
- `progress` — update when work meaningfully advances
- `phase`, `active_role`, `artifacts`, `sprints` — maintain as tasks progress

**Story ID format:** `S{sprint number}-{sequence:02d}`. Example: sprint 1, story 3 = `S1-03`. Sprint 12, story 1 = `S12-01`.

**When to update:** After every model command. At minimum update `active_role` and `next_action`. Update `progress` and `phase` when work meaningfully advances the project.
 
---

## Flags

- `--pause`: Stop the chain after the current task. Use this if the user explicitly asked you to stop after one step.
- `--code`: Modifier for `audit` — focus on code quality only.

---

## Output Files

All outputs go to `bmad/artifacts/` or subdirectories:

```
bmad/
├── status.yaml
├── config.yaml
└── artifacts/
    ├── plan-prd.md
    ├── plan-arch.md
    ├── sprint-2026-03-12.md
    ├── audit-2026-03-12.md
    ├── stories/
    │   ├── S1-01.md
    │   └── S1-02.md
    ├── docs/
    │   ├── README.template.md
    │   └── README.draft.md
    └── history/
        └── status-2026-03-12-143022.md
```

---

## Execution Honesty Rule

**Never report results you have not actually obtained.**

---

## Chain Protocol Trust Rule (CRITICAL)

**See `references/status-yaml-validation.md` for detailed validation rules.**

In brief: `next_command` and `next_role` MUST stay in sync. Inconsistency = chain breaks = hard blocker.

---

The only valid reason to stop is a **hard blocker**: a required file is missing, a command fails with an unrecoverable error, inconsistent `next_command`/`next_role`, or the user explicitly wrote "stop", "pause", or "wait". In that case, report the specific blocker — do not ask for general guidance.

---

## What This Skill Is NOT
- Does NOT invent tools or functions
- Does NOT pretend to create files it doesn't really create
- Does NOT require reference files for script commands (role files are required for model commands)

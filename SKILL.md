---
name: bmad-master
description: |-
  Project orchestrator — Your interface between you and the development workflow.
  Say what you want, BMAD handles the rest. No management overhead, no technical jargon.

  Main commands:
  - `bmad init PROJECT_NAME` — Start a new project
  - `bmad continue` — Keep working (implements stories, runs tests, chains automatically)
  - `bmad status` / `bmad what's next` — Display current state (reads status.yaml, no execution)
  - `bmad analyze` — Rebuild status.yaml from project state (explicit regeneration)
  - `bmad test` — Run tests (unit + e2e)
  - `bmad audit` — Check code quality
  - `bmad doc` — Generate docs/README

  Internal workflow (BMAD handles automatically): planning → sprints → stories → dev → test
  Note: publish, tag, and release are handled by CI — BMAD stops at passing tests.

  Triggers: "bmad", "what's next", "continue", "status", "test", "audit"
  Use whenever you have project work to do. Just say it naturally.
argument-hint: "init, continue, status, what's next, analyze, test, audit, doc"
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

**IMPORTANT — Working Directory Rule:** All file operations work on the user's **current project directory** (where they ran `bmad continue`), NEVER the skill's internal folder. Do not access `C:\Users\Mydde\.claude\skills\bmad-master\bmad\` — that is the skill's bootstrap template only.

---

### ⚡ SHORT-CIRCUIT: `bmad status` and `bmad what's next`

`status.yaml` is kept up to date automatically throughout the workflow (by every other command). `bmad status` simply reads and displays it — it never rebuilds it.

If the command is **`bmad status`** or **`bmad what's next`**:

1. Use the **Read tool** on `./bmad/status.yaml` — this is the ONLY tool call allowed
2. Render the status template from scrum.md
3. **STOP** — no role activation, no chain, no CLI, no shell, no Node.js, no writes

**To rebuild status.yaml from scratch**, the user must explicitly say `bmad analyze`. That is a different command with a different purpose.

Do NOT proceed past this block for `bmad status`. Do NOT enter the Role Activation Checklist.

---

**Use as Orchestrator:** Read `./bmad/status.yaml` from the user's current directory → understand project state → execute task with appropriate role → update status → chain to next action automatically. No waiting for user input between steps. The YAML file is the state machine; follow it.

**Mandatory first step — always:** Check if `./bmad/status.yaml` exists in the current directory (not a parent). If yes, read it. If no, run `bmad init`. This step is not optional and cannot be assumed — it must actually happen.

**Assumption-first approach:** Only use `> Assumed:` for *implementation decisions* (how to build a feature, what test framework to use, etc.). Never assume the state of status.yaml — always read it first. This is the key difference between a productive assumption and stalling.

Action guarantee: every command (except `bmad status`) must produce at least one concrete, verifiable result:
- `./bmad/status.yaml` was read AND updated (`active_role`, `next_action`, `progress`)
- A file was written to `./bmad/artifacts/`
- A code/test change was made in the project

**Mid-flight feature rule:** If the user describes a new feature, improvement, or requirement at any point during development — even casually ("it would be nice if...", "can we also add...", "j'aimerais aussi...") — treat it as a feature request. Activate the PM role to integrate it into the existing PRD, create a story, add to the sprint, and resume the chain. Never ignore it, never ask "should I add this to the backlog?" — just integrate it and continue.

**Monorepo rule:** Always use the current working directory. Never walk up to parent directories to find a `bmad/` folder — each package manages its own. If the user is in `packages/idae-machine`, work with `packages/idae-machine/bmad/` only.

If no `./bmad/` folder exists **in the exact cwd**, create it with `bmad init` immediately — do not ask the user to describe their project first. If `./bmad/` exists but status.yaml lacks Chain Protocol fields (next_command, next_role), add the missing fields using the Edit tool. If no command is given, use the **Read tool** on `./bmad/status.yaml` and display the status template.

---

## Chain Protocol

**After every model command, you MUST chain to the next action automatically.** This is not optional. It is the default behavior. Productivity first.

**status.yaml update is SILENT and DONE FIRST** — update it before displaying anything to the user. Never list it as a pending step. Never say "I will update status.yaml" — just do it.

**`bmad status` is SHORT-CIRCUITED above** — it never reaches this section. If you are reading this for a `bmad status` command, go back to the SHORT-CIRCUIT block and stop there.

**Writing status.yaml:** Always use the **Edit tool** directly on `./bmad/status.yaml`. Never use shell commands (PowerShell, bash, Node.js) to modify it.

**Normal flow (bmad continue):** Execute → update status.yaml via Edit tool → chain to next action. No menu, no choices, no interruptions. Just show:
```
[DONE: <what you just completed — specific: files created, tests run, results>]
[NEXT: <next action>]
--- executing ---
```

**Decision points only** — show a menu when BMAD reaches a genuine fork that requires human judgment:
- End of a sprint (all stories done)
- End of a milestone (release, major refactor)
- Two or more equally valid directions exist

At a decision point, show:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  <project>  |  <phase>  |  <progress>%
  Sprint <N> complete — what's next?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Next sprint  — <sprint goal>
  2. Polish       — CHANGELOG, README update
  3. Test         — full e2e suite
  4. Pause
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Then wait for the user's answer before continuing.

**Anti-loop rule (CRITICAL):** After completing a task, `next_action` in status.yaml MUST be different from what it was before. If you are about to write the same `next_action` again, you are in a loop — stop, identify what was actually completed, mark it done, and advance to the genuinely next step.

Hard blockers (stop chain):
- Missing required file, command fails unrecoverably, data loss risk
- `next_action` would be identical to the previous one (loop detected)

Note: End-to-end (`e2e`) test failures are not considered hard blockers by default. Treat e2e failures as soft blockers: report failures clearly and include them in `bmad/artifacts/` test reports, but continue the Chain Protocol unless the failure signals an unrecoverable environment issue (for example, missing test runner, infrastructure down, or persistent permission/credential errors). Only then should the chain stop as a hard blocker.

Action-first rules (no stalling on proposals):
- When executing a model command, pick a single, concrete recommended action and execute it immediately. Do not present multiple alternative proposals as a substitute for action.
- You may include optional alternatives in the artifact or report, but they must not block the chosen action or the Chain Protocol.
- Always update `bmad/status.yaml` after taking action to record progress and the chosen next step.

**Why this works:** The chain is driven by `status.yaml`. After each task, update `next_action` in `status.yaml`, then read it back and act. The file is the single source of truth — not memory, not conversation history.

**For small models especially:** The instruction is simple. When you finish a task, print `[DONE: X]`, print `[NEXT: Y]`, then do Y. No questions. No confirmation. Just do it.

---

## Instructions


---

## What You Say (User Interface)

These are the only commands you need. BMAD handles everything else automatically.

| You Say | What happens |
|---------|-------------|
| `bmad init <project>` | Create project structure, ready to start |
| `bmad continue` | Keep working: implement stories, write tests, chain to next step automatically |
| `bmad status` / `bmad what's next` | **Display** current state — reads `status.yaml` and shows it. No execution. |
| `bmad analyze` | **Rebuild** `status.yaml` from scratch by scanning the project. Use when status is stale or missing. |
| `bmad test` | Run all tests (unit + e2e). Non-critical e2e failures won't block progress |
| `bmad audit` | Check code quality and surface issues |
| `bmad doc` | Generate/update project docs and README |

**That's it. Everything else (planning, sprints, stories, role assignments, test orchestration) happens automatically behind the scenes.**

---

## How BMAD Works (Internal)

These script commands run deterministically to manage state. **You never call these directly** — BMAD executes them as needed.

| Internal Command | What it does |
|---------|-------------|
| `bmad snapshot` | Save timestamped copy of `status.yaml` to `artifacts/history/` |
| `bmad connector` | Generate `artifacts/connector.yml` manifest |
| `bmad config set/get/unset` | Manage skill configuration overrides |
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

1. **Read `./bmad/status.yaml` now** — This is mandatory, not optional. Read the actual file from the project's current directory. If it doesn't exist, run `bmad init` and stop. If it exists, extract: phase, progress, next_action, next_command, next_role. Do not proceed without real data from this file — no assumptions about its contents.
2. **Check `references/overrides.json`** — if the file exists, read it. If not, skip to step 3.
   - If `role.<name>.prompt` exists for this role: note it (you'll prepend it in step 4)
   - If `role.<name>.ref` exists: note the file path (you'll read it **in addition to** the role file)
3. **Read the role file** from `references/roles/<name>.md`
4. **If overrides were found in step 2:**
   - Prepend `role.<name>.prompt` text before the role instructions
   - Read the file at `role.<name>.ref` as additional context
5. **Print role tag:** First line of response must be **[PM]**, **[Architect]**, **[Developer]**, **[Reviewer]**, **[Tester]**, **[Scrum Master]**, or **[Designer]**
6. **Execute the command** following the role's perspective, priorities, and output format. Perform at least one concrete action (see "Action guarantee" above) before producing non-actionable proposals.
7. **Update project state (CRITICAL for Chain Protocol):** Modify the project's `./bmad/status.yaml` to reflect:
   - `active_role` = current role
   - `next_action` = human-readable description
   - `next_command` = executable command (must match next_role)
   - `next_role` = which role executes next (must match next_command)
   - `progress` when work meaningfully advances
   - **Validation:** Ensure `next_command` and `next_role` are in sync (see Validation Rules table above). Inconsistency breaks the chain.
   - **How to write:** Use the filesystem directly; do NOT use engine.mjs for writes.

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

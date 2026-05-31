---
name: bmad-method
description: |-
  [bmad-init <PROJECT_NAME>] (Start a new BMAD project.)
  [bmad-continue] (Resume the workflow and implement the next story.)
  [bmad-status|bmad-whats-next] (Render `./bmad/status.yaml` to markdown on demand; there is no cached `status.md`.)
  [bmad-rebuild] (Rebuild status.yaml + status.md from project state.)
  [bmad-test] (Run unit and e2e tests.)
  [bmad-audit] (Review code quality.)
  [bmad-doc] (Generate docs and README output.)
  Project orchestrator for planning, sprints, stories, dev, and test.
  Triggers on bmad commands, "what's next", and role intents like develop,
  design, architect, review, test, and plan. Standalone roles also work.
argument-hint: "bmad-init, bmad-continue, bmad-status, bmad-rebuild, bmad-test, bmad-audit, bmad-doc"
compatibility:
  - mcp_v2
user-invocable: true
disable-model-invocation: false
license: MIT
metadata:
  version: "5.0.0"
  release: "v5.1.0"
  author: medyll
---

# BMAD – Project Orchestrator

## Terminology

- **Command** (skill command): A user directive like `bmad-continue`, `bmad-sprint`, `bmad-status`, `bmad-init`. Interpreted by the LLM per this skill — not a script or binary. **Always hyphenated, never space-separated.**
- **Shell command**: A terminal command executed via the run_shell_command tool (e.g., `npm test`, `git commit`, `node scripts/engine.mjs init`).
- **Instruction**: General guidance or constraint given to the LLM about how to behave (e.g., "always update status.yaml after an action", "never assume test results").
- **Internal directive**: A bmad-method-specific label like `bmad-snapshot` or `bmad-connector`. Still LLM-executed, not a real script — bmad-method carries out the steps described here.
- **Engine command**: Internal script commands in `scripts/engine.mjs` (e.g., `init`, `analyze`, `snapshot`). Invoked by the LLM via shell when needed — never exposed to users.
- If `node scripts/engine.mjs` is missing in cwd, copy it from `references/engine.mjs` before invoking. If the copy also fails, report: `Engine script missing. Re-run bmad-init to restore project scaffold.` and stop.

---

---

## Activation Fork

- If the command contains `bmad-` or `./bmad/` already exists, use **Role Activation (4 steps)** below.
- If the command does not contain `bmad-` and `./bmad/` does not exist, use **Standalone Role Mode**.

## Standalone Role Mode

**Role keywords WITHOUT "bmad-"** → activate standalone expert mode. Role file = source of truth.

| Keywords | Role | File |
|----------|------|------|
| develop, implement, code, fix | Developer | `references/roles/dev.md` |
| design, ui, ux, css | Designer | `references/roles/designer.md` |
| architect, system design | Architect | `references/roles/architect.md` |
| review, audit | Reviewer | `references/roles/reviewer.md` |
| test, qa | Tester | `references/roles/tester.md` |
| plan, product, prd | PM | `references/roles/pm.md` |
| sprint, scrum | Scrum Master | `references/roles/scrum.md` |

**Activation:** Read role file → print `[Role]` tag → check for `./bmad/status.yaml` → execute task.

**If `./bmad/` exists:** update `active_role`, `progress`, `next_action`, `next_command`, and `next_role` in `status.yaml`, write artifacts as needed, then stop. Do not auto-chain after standalone role execution unless the user issued a `bmad-` command.

**No bmad/ folder:** Work standalone, no status tracking.

**Skill authoring:** Task involves `SKILL.md` or skill structure? → invoke `skill-master` immediately.

---

## Core Behavior

**IMPORTANT — Working Directory Rule:** All file operations work on the user's **current project directory** (where they ran `bmad-continue`), NEVER the skill's internal folder. Do not access `C:\Users\Mydde\.claude\skills\bmad-master\bmad\` — that is the skill's bootstrap template only.

---

###  ⚡ SHORT-CIRCUIT: `bmad-status` and `bmad-whats-next`

`bmad-status` renders the current `status.yaml` view on demand — there is no cached presentation file.

If the command is **`bmad-status`** or **`bmad-whats-next`**:

1. **Run** `node scripts/engine.mjs render` via shell
2. **Display** its output verbatim to the user
3. **STOP** — no role activation, no chain, no regeneration

**To rebuild status from scratch**, the user must explicitly say `bmad-rebuild` (which invokes `node scripts/engine.mjs analyze`). That is a different command with a different purpose.

Do NOT proceed past this block for `bmad-status`. Do NOT enter the Role Activation Checklist.

---

### Status Generation (done first, verify after write)

**Every command** (except `bmad-status`) MUST update `status.yaml` first, then verify the write after execution:
1. **Update `./bmad/status.yaml`** via Edit tool — all fields including 3 dimensions (`marketing`, `product`, `far_vision`, max 4 lines each).
2. **Verify** — re-read yaml to confirm write succeeded. If the re-read does not match the intended write, retry the Edit tool once. If the second attempt also fails, halt the chain and report: `status.yaml write failed — manual inspection required at ./bmad/status.yaml`.

`status.yaml` = single source of truth. No presentation file to maintain — `bmad-status` renders on demand via `engine render`.

---

**Orchestrator:** Read `status.yaml` → execute with role → update status first → verify → chain automatically.

**First step (mandatory):** Check if `./bmad/status.yaml` exists (exact cwd, not parent). If no → `bmad-init`. If yes → read it first, no assumptions.

**Action guarantee:** Every command produces: status files updated OR artifact written OR code/test changed.

**Mid-flight feature:** User mentions feature/improvement → silently add it to `status.yaml` backlog with a `⚠` tag → continue current chain without interruption. Do not switch to PM role mid-chain. Announce the addition in the `[DONE]` summary line only.

**Monorepo:** Work in exact cwd only. Never walk up to parent for `bmad/`.

---

## Chain Protocol

**Chain automatically after every command.** No waiting, no menus (except decision points).

**status.yaml update:** SILENT, DONE FIRST via Edit tool. Never list as pending step.

**Normal flow:** Execute → update yaml → `[DONE: X]` → `[NEXT: Y]` → execute next.

**Decision points** (show menu only here):
- End of milestone
- 2+ equally valid directions

**Anti-loop rule:** `next_action` MUST differ from previous. Same action = stop, identify what completed, advance.

**Hard blockers:** See **Hard Blockers (Exhaustive)** below.

**TEST ENFORCEMENT (CRITICAL):** Story complete = tests executed + pass. Forbidden: "should pass", "you can test it", "tests should be fine". Required: actual shell output captured to artifact file.

## Hard Blockers (Exhaustive)

Stop the chain only for:

1. Missing required file that cannot be inferred or restored from project context.
2. Unrecoverable shell or tool error after one retry.
3. Inconsistent `next_command`, `next_role`, or other `status.yaml` state that cannot be reconciled.
4. User explicitly says "stop" or "pause".
5. The next step is truly unclear after reading `status.yaml`, the active role file, and nearby context, and cannot be resolved with an assumption.
6. Sprint completion gate: all stories are done, but `bmad-test unit` has not run successfully and `bmad/artifacts/test-results-sprint-<N>.md` with a passing marker does not exist.

---

## bmad-run — Scoped Autonomous Execution

Hands-off variant of `bmad-continue`. Accepts a **scope** and executes without stopping (except on hard blockers).

**Syntax:** `bmad-run` (auto-scope), `bmad-run story <ID>`, `bmad-run sprint`, `bmad-run sprint <N>`

**Auto-scope:** Reads `status.yaml` → runs story if `next_command` points to one, otherwise runs active sprint.

**Execution:** No mid-scope interruptions. Per-story: Dev → Test → close (or fix cycle). Update `status.yaml` after each story.

**Postponed stories:** Skip postponed or blocked stories, log the skipped story ID in `[DONE]`, and continue to the next eligible story. If every remaining story is postponed or blocked, stop and report the sprint blocked.

**Stop on:** Any hard blocker from the list above, end of scope, or user says "stop"/pause".

---

## bmad-init — Project Initialization

**Project name rule:** Never ask the user for a project name. Infer it from the current directory name (e.g. `singleton-notepad` from `D:\boulot\dev\winui\singleton-notepad\`). If a name was passed as argument, use it. Never stall on this.

**Implementation:** The LLM invokes `node scripts/engine.mjs init` via shell to create the structure, then proceeds with PM role activation.

### Standard Scaffold

`bmad-init` creates the `bmad/` folder structure:

```
bmad/
├── status.yaml       # Single source of truth — render with: node scripts/engine.mjs render
├── config.yaml       # Project settings
├── bmad-openspace.md # Inter-role communication
├── conventions.md    # Discovered project conventions
└── artifacts/
    ├── stories/
    ├── docs/
    └── history/
```

### Intake-Sources: Scanning Existing Files

**Before scaffolding**, `bmad-init` scans the current directory for pre-existing files and folders that may express the user's intent for the project.

**What to scan:**
- Any file or folder directly in the cwd that is NOT: hidden (`.git`, `.env*`), a system file, or already a `bmad/` folder
- Typical candidates: `SCRATCHPAD.md`, `README.md`, `notes.txt`, `ideas/`, `specs/`, `wireframes/`, `*.md`, `*.txt`, `*.pdf`, loose source folders

**Procedure:**

1. **List** all non-hidden files/folders in cwd
2. **If any exist** → create `bmad/intake-sources/` and move them there
3. **Generate `bmad/intake-sources/_index.md`** — list of files + 2-4 sentence intent reading + signals for PM (see template: `references/templates/intake-templates.md`)
4. **Proceed** with normal bmad/ scaffold (status.yaml, config.yaml, artifacts/)
5. **PM role** MUST read `bmad/intake-sources/` before writing the PRD

**If a file cannot be moved:** copy it instead, add a `⚠` note in `_index.md` saying `[filename] could not be moved — copied only, original remains in cwd.`, and continue init.

**If cwd is empty:** skip intake scan, proceed directly to scaffold. Do NOT delete or modify intake files.

### Auto-rationalization (light pass at init)

After collecting: read each file, extract purpose/features/constraints/gaps, write `bmad/intake-sources/INTENT.md` (level: light). Gaps = `⚠` warnings, never blockers. Template: `references/templates/intake-templates.md`.

---

## bmad-rebuild — Project Analysis

**Implementation:** LLM invokes `node scripts/engine.mjs analyze` → generates complete `status.yaml` (languages, dependencies, phase, Chain Protocol fields, 3 dimensions).

**When:** Joining project without `bmad/status.yaml`, refreshing after major changes, or user requests.

---

## bmad-rationalize — Deep Rationalization

Refines `INTENT.md` — reformulates existing content only, no ideation.

**When:** After `bmad-init` if light pass too sparse, user added sources, or PM needs cleaner input.

**Procedure:** Read `bmad/intake-sources/` → restructure (Purpose, Users, Features, Context, Questions `⚠`) → overwrite `INTENT.md` (level: full) → update yaml (`next_role: PM`).

**Heuristic with bmad-init:** Sparse = fewer than 10 meaningful lines across all intake files combined, excluding blank lines and headers. Rich = any single file contains structured sections (headings, bullet lists, tables) or total extracted content exceeds 10 meaningful lines. User says "rationalize" → full rationalize.

---

## How bmad-method Works (Internal)

**Engine script** (`scripts/engine.mjs`) — invoked by LLM via shell when needed:

| Command | What it does | Invoked by |
|---------|--------------|------------|
| `init` | Create `bmad/` structure | `bmad-init` |
| `analyze` | Scan project, generate status.yaml (preserves adrs + backlog) | `bmad-rebuild` |
| `render` | Render status.yaml as markdown to stdout (no file written) | `bmad-status`, `bmad-whats-next` |
| `update` | Add missing Chain Protocol fields | Auto |
| `snapshot` | Save status.yaml to `artifacts/history/` | `bmad-snapshot` |
| `connector` | Generate `artifacts/connector.yml` | `bmad-connector` |
| `config` | Manage skill config (get/set/unset) | `bmad-config-*` |

**Internal directives** — LLM-executed workflows (not scripts): `bmad-snapshot`, `bmad-connector`, `bmad-config-*`.

---

## Roles

Each skill command has a corresponding **role** — a contextual lens that shapes how the model approaches the task. Role files are in `references/roles/` and must be read before executing skill commands.

| Role | File | Commands | Ownership |
|------|------|----------|-----------|
| **PM** | `references/roles/pm.md` | `bmad-plan-prd`, `bmad-plan-spec` | — |
| **Architect** | `references/roles/architect.md` | `bmad-plan-arch`, `bmad-rebuild`, `bmad-adr` | **Writes ADRs** to `status.yaml adrs:` |
| **Developer** | `references/roles/dev.md` | `bmad-dev-story`, `bmad-fix`, `bmad-continue`, `bmad-postpone` | Postpones blocked stories to backlog |
| **Reviewer** | `references/roles/reviewer.md` | `bmad-dev-review`, `bmad-audit` | — |
| **Tester** | `references/roles/tester.md` | `bmad-test-unit`, `bmad-test-e2e` | — |
| **Scrum Master** | `references/roles/scrum.md` | `bmad-sprint`, `bmad-sprint-story`, `bmad-next`, `bmad-status`, `bmad-backlog` | **Reads + grooms backlog**; promotes to sprint |
| **Designer** | `references/roles/designer.md` | `bmad-doc` (UI docs), component design, CSS/HTML tasks | — |

`readme` has no role — use project context directly.

### Role Activation (4 steps)

1. **Read `./bmad/status.yaml`** (mandatory). No yaml → `bmad-init`. Extract: phase, progress, next_action, next_command, next_role.
2. **Read context files** (if exist): `bmad-openspace.md`, `conventions.md`.
3. **Pick agent name** from `references/roles/identities/agent-names.md` → sign `[Role - Name]`. Check `overrides.json` for role prompts/refs.
4. **Read role file** → print `[Role]` tag → execute → update yaml (`active_role`, `next_action`, `next_command`, `next_role`, `progress`).

**Skill authoring task?** → invoke `skill-master` before inventing rules.

**Roles Autonomy:** Decide and act from context. Document assumptions with `> Assumed:`. Ask only for hard blockers from the exhaustive list above.

---

## status.yaml Schema

**Full schema + validation:** `references/status-yaml-validation.md`

**Key fields:** `next_action`, `next_command`, `next_role` (MUST sync), `progress`, `phase`, `active_role`, `marketing`, `product`, `far_vision`.

**Story ID:** `S{sprint}-{seq:02d}` (e.g., `S1-03`, `S12-01`).

**Update:** End of every command. Use Edit tool. Verify after write.

---

## Flags

`--pause` (stop chain after task), `--code` (audit: code quality only).

---

## Execution Honesty

Forbidden: "tests pass", "works", "should work", "you can test it". Required: actual output path + result.

---

## Inter-Agent Communication

**Identities/format:** `references/roles/identities/agent-identities.md`  
**Name pools:** `references/roles/identities/agent-names.md`

---

## conventions.md

Append-only project conventions. Location: `./bmad/conventions.md`. Read before coding. Breaking changes → note in `bmad-openspace.md`.

---

## What This Skill Is NOT

❌ Invent tools/functions  ❌ Pretend to create files  ❌ Require reference files for shell commands

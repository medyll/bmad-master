---
name: bmad-master
description: |-
  Project orchestrator for managing development workflows end-to-end.
  Use for: creating project structure, planning work, tracking progress, writing docs, running tests, auditing code, organizing sprints and stories.
  Triggers: "what's next?", "create sprint", "make roadmap", "audit code", "help plan", "write spec", "generate README", "organize my project", "what should I work on", "project management", "track progress", "backlog", "prioritize tasks", "set up project", "dev workflow", "project status", "start new project".
  Use this skill whenever the user mentions project orchestration, task tracking, sprint planning, story management, or wants to structure their development workflow — even if they don't say "bmad" explicitly.
  Commands: [init] [analyze] [status] [next] [plan] [sprint] [dev] [test] [audit] [doc] [readme] [fix]
argument-hint: "init, analyze, status, next, next --auto, plan prd, plan spec, plan arch, sprint, sprint story, dev story, dev review, test unit, test e2e, audit, audit --code, doc, readme, readme --fill, fix"
compatibility:
  - mcp_v2
user-invocable: true
disable-model-invocation: false
license: MIT
metadata:
  version: "4.2.0"
  release: "v4.2.0 – Roles Edition"
  author: medyll
---

# BMAD – Project Orchestrator

## Core Behavior

**This skill does ONE thing:** Read `bmad/status.yaml` and tell you what to do next.

If no `bmad/` folder exists, suggest creating one with `bmad init`.

---

## Commands

Commands fall into two categories:
- **Script commands** run via `node scripts/bmad.mjs <cmd>` and produce deterministic output
- **Model commands** are executed by the AI model using the project context and `status.yaml`

### Script Commands (deterministic)

| Command | What it does |
|---------|-------------|
| `bmad init` | Create `bmad/` with `status.yaml`, `config.yaml`, `artifacts/` |
| `bmad analyze` | Scan project, generate `status.yaml` from existing code |
| `bmad status` | Read and display `status.yaml` |
| `bmad next` | Show next recommended action from `status.yaml` (script only — no `--auto`) |
| `bmad snapshot` | Save timestamped copy of `status.yaml` to `artifacts/history/` |
| `bmad connector` | Generate `artifacts/connector.yml` manifest |
| `bmad readme` | Generate README template in `bmad/artifacts/docs/` |
| `bmad readme --fill` | Analyze project and write pre-filled README draft |
| `bmad config set <key> <val>` | Set a skill reference override |
| `bmad config get [key]` | Show current overrides |
| `bmad config unset <key>` | Remove an override |

### Model Commands (AI-executed)

These commands are interpreted and executed by the model. The model reads `status.yaml`, understands the project context, and produces the appropriate output.

| Command | What it does | Output |
|---------|-------------|--------|
| `bmad plan <type>` | Create a plan document. Types: `prd`, `spec`, `arch` | `bmad/artifacts/plan-{type}.md` |
| `bmad sprint` | Create a sprint from backlog/plan | `bmad/artifacts/sprint-{date}.md` |
| `bmad sprint story` | Add a story to current sprint | `bmad/artifacts/stories/{id}.md` |
| `bmad dev story <id>` | Implement a story (code + tests) | Code changes + updated `README.md` |
| `bmad dev review` | Review code changes | Feedback + fixes |
| `bmad test <type>` | Run tests. Types: `unit`, `e2e` | Test results |
| `bmad audit [--code]` | Audit codebase for issues | `bmad/artifacts/audit-{date}.md` |
| `bmad doc` | Generate documentation | `bmad/artifacts/docs/` |
| `bmad fix [--syntax]` | Fix issues in code | Code changes |

For model commands: read `status.yaml`, load the corresponding role, execute the task, then update `status.yaml` with new progress/phase/next_action.

---

## Roles

Each model command has a corresponding **role** — a contextual lens that shapes how the model approaches the task. Role files are in `references/roles/` and must be read before executing model commands.

| Role | File | Commands |
|------|------|----------|
| **PM** | `references/roles/pm.md` | `plan prd`, `plan spec` |
| **Architect** | `references/roles/architect.md` | `plan arch`, `analyze` |
| **Developer** | `references/roles/dev.md` | `dev story`, `fix` |
| **Reviewer** | `references/roles/reviewer.md` | `dev review`, `audit` |
| **Tester** | `references/roles/tester.md` | `test unit`, `test e2e` |
| **Scrum Master** | `references/roles/scrum.md` | `sprint`, `sprint story`, `next`, `status` |
| **Designer** | `references/roles/designer.md` | `doc` (UI docs), component design, CSS/HTML tasks |

`readme` has no role — use project context directly.

### Role Activation Checklist

Follow these steps **in order** every time you execute a model command:

1. **Read `bmad/status.yaml`** — get current phase, progress, next_action
2. **Check `references/overrides.json`** — if the file exists, read it. If not, skip to step 3.
   - If `role.<name>.prompt` exists for this role: note it (you'll prepend it in step 4)
   - If `role.<name>.ref` exists: note the file path (you'll read it **in addition to** the role file)
   - If `theme` exists and the role is Designer: note the path (replaces default `references/theme.css`)
3. **Read the role file** from `references/roles/<name>.md`
4. **If overrides were found in step 2:**
   - Prepend `role.<name>.prompt` text before the role instructions
   - Read the file at `role.<name>.ref` as additional context
   - For Designer: read the theme file from override (or default `references/theme.css` if no override)
5. **Print role tag:** First line of response must be **[PM]**, **[Architect]**, **[Developer]**, **[Reviewer]**, **[Tester]**, **[Scrum Master]**, or **[Designer]**
6. **Execute the command** following the role's perspective, priorities, and output format
7. **Update `bmad/status.yaml`:** Set `active_role`, update `progress` and `next_action`. Always update after model commands, even if the change seems minor.

### Reference Overrides

Projects can customize role behavior with `bmad config`:

```bash
bmad config set theme ./src/styles/theme.css          # Designer reads this instead of default
bmad config set role.designer.ref ./docs/design.md     # Additional file for Designer (read alongside role)
bmad config set role.pm.prompt "HIPAA compliance required"  # Prepended to PM instructions
bmad config get                                        # Show all overrides
bmad config unset theme                                # Remove an override
```

Override rules:
- `theme` → **replaces** default `references/theme.css` (Designer only)
- `role.<name>.ref` → **added alongside** the role file (both are read)
- `role.<name>.prompt` → **prepended** to role instructions as extra context
- Only one value per key. Setting a key again overwrites the previous value.

---

## status.yaml Schema

Models must read and update this file. Fields marked **(required)** must always be present. Fields marked **(optional)** can be omitted.

```yaml
# BMAD Status
project: my-project              # (required) string — project name
phase: development               # (required) one of: planning | development | testing | release
progress: 45                     # (required) integer 0-100
next_action: "Implement S1-02"   # (required) string — free text describing the next step
active_role: dev                  # (optional) one of: pm | architect | dev | reviewer | tester | scrum | designer

phases:                          # (required) exactly these 4 entries, in this order
  - name: planning
    status: done                 # (required) one of: done | in_progress | upcoming
  - name: development
    status: in_progress
  - name: testing
    status: upcoming
  - name: release
    status: upcoming

artifacts:                       # (optional) keys are artifact names, values are status
  prd: done                      # one of: done | in_progress | missing
  architecture: done
  tech-spec: in_progress

sprints:                         # (optional) array of sprint objects
  - id: 1                        # integer — sprint number, starts at 1
    status: active               # one of: active | completed | planned
    stories: ["S1-01", "S1-02"]  # array of story IDs, pattern: S{sprint}-{seq:02d}
```

**Story ID format:** `S{sprint number}-{sequence:02d}`. Example: sprint 1, story 3 = `S1-03`. Sprint 12, story 1 = `S12-01`.

**When to update:** After every model command. At minimum update `active_role` and `next_action`. Update `progress` and `phase` when work meaningfully advances the project.

---

## How It Works

1. **Check for `bmad/` folder** in current directory only (do not search parent directories)
2. **If found:** Read `bmad/status.yaml` → extract current phase, progress, next action
3. **Print status line:** `[bmad] resuming: <project> | phase: <phase> | next: <action>`
4. **For model commands:** Follow the Role Activation Checklist (see Roles section above)
5. **Execute command** (script or model command)
6. **Update `bmad/status.yaml`** — always update `active_role` and `next_action` after model commands
7. **Done.**

---

## Flags

These flags modify **model behavior** — they are NOT passed to `node scripts/bmad.mjs`. Never run `node scripts/bmad.mjs next --auto` or `npx bmad next --auto`. The model handles `--auto` itself by reading `status.yaml` and looping.

- `--auto`: The model runs the next recommended action autonomously, then loops — reading `status.yaml`, executing the next step, updating `status.yaml`, and repeating — until the project is done or an error occurs. No shell command is involved.
- `--delay <seconds>`: Wait N seconds between iterations (for rate-limiting)

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

## Multi-Model Notes

This skill works across different model capabilities:

- **Strong models (Opus, GPT-5, Sonnet):** Can handle all model commands autonomously. Use `--auto` freely.
- **Smaller models (Haiku, gpt5-mini):** Stick to script commands (`init`, `analyze`, `status`, `next`) and execute model commands one at a time without `--auto`. **Do NOT attempt to run `bmad next --auto` as a shell command** — `--auto` is handled entirely by the model, not the CLI. When you see `bmad next --auto`, read `status.yaml`, execute the next action yourself, update `status.yaml`, and repeat.

For all models: always read `status.yaml` before acting, and update it after completing work.

---

## Autonomy Rule

**Roles are autonomous agents. They do not ask questions.**

When context is available (status.yaml + role file + project files), proceed directly. If information is ambiguous or missing:
1. Make the most reasonable assumption given the available context
2. State the assumption clearly at the start of your output (e.g., `> Assuming: no existing test suite found, starting fresh`)
3. Continue executing

This applies with or without `--auto`. The user invoked a role to get work done, not to answer questions. Questions about things outside the user's domain (CI config, dependency choices, naming conventions) are especially prohibited — just decide.

The only valid reason to stop is a **hard blocker**: a required file is missing, a command fails with an unrecoverable error, or proceeding would cause data loss. In that case, stop and report the specific blocker — do not ask for general guidance.

---

## What This Skill Is NOT

- Does NOT invent tools or functions
- Does NOT pretend to create files it doesn't really create
- Does NOT require reference files for script commands (role files are required for model commands)

## What This Skill DOES

- Reads real files from disk
- Executes real commands (or writes real artifacts)
- Updates status.yaml when milestones are reached
- Suggests the next logical step based on current project state
- Stops if something fails

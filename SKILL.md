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
  version: "4.1.0"
  release: "v4.1.0 – Multi-platform Edition"
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
| `bmad next` | Show next recommended action from `status.yaml` |
| `bmad snapshot` | Save timestamped copy of `status.yaml` to `artifacts/history/` |
| `bmad connector` | Generate `artifacts/connector.yml` manifest |
| `bmad readme` | Generate README template in `bmad/artifacts/docs/` |
| `bmad readme --fill` | Analyze project and write pre-filled README draft |

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

For model commands: read `status.yaml`, execute the task, then update `status.yaml` with new progress/phase/next_action.

---

## status.yaml Schema

This is the expected structure. Models should read and update this file:

```yaml
# BMAD Status
project: my-project
phase: development          # planning | development | testing | release
progress: 45                # 0-100
next_action: "Implement login story S1-02"

phases:
  - name: planning
    status: done             # done | in_progress | upcoming
  - name: development
    status: in_progress
  - name: testing
    status: upcoming
  - name: release
    status: upcoming

artifacts:
  prd: done                  # done | in_progress | missing
  architecture: done
  tech-spec: in_progress

sprints:
  - id: 1
    status: active
    stories: ["S1-01", "S1-02", "S1-03"]
```

---

## How It Works

1. **Check for `bmad/` folder** in current directory or parent
2. **If found:** Read `bmad/status.yaml` → extract current phase, progress, next action
3. **Print status line:** `[bmad] resuming: <project> | phase: <phase> | next: <action>`
4. **Execute command** (script or model command)
5. **Update status.yaml** if the action changed project state
6. **Done.** No extra logic, no role routing.

---

## Flags

- `--auto`: Run continuously without stopping (until done or error)
- `--delay <seconds>`: Wait N seconds between actions (for rate-limiting)

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
- **Smaller models (Haiku, gpt5-mini):** Stick to script commands (`init`, `analyze`, `status`, `next`) and execute model commands one at a time without `--auto`. The status.yaml schema above helps these models understand the expected format.

For all models: always read `status.yaml` before acting, and update it after completing work.

---

## What This Skill Is NOT

- Does NOT invent tools or functions
- Does NOT pretend to create files it doesn't really create
- Does NOT guess what to do if the command is unclear
- Does NOT require reading other reference files (they're optional)

## What This Skill DOES

- Reads real files from disk
- Executes real commands (or writes real artifacts)
- Updates status.yaml when milestones are reached
- Suggests the next logical step based on current project state
- Stops if something fails

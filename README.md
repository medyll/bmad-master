# bmad-master

A multi-role AI orchestrator for structured software project management based on the BMAD Method.

## What it does

`bmad-master` routes requests to the appropriate specialist role and manages the full software development lifecycle, from product discovery to deployment:

| Role | Responsibility |
|---|---|
| **Analyst** | Product briefs, research, audits (`/audit`, `/audit --full`, etc.) |
| **Product Manager** | PRDs, tech specs, roadmaps (`/prd`, `/roadmap`) |
| **Architect** | Architecture design, stack decisions (`/architecture`, `/stack`) |
| **Scrum Master** | Sprint planning, story creation (`/sprint-planning`, `/create-story`) |
| **Developer** | Dev stories, code review, refactoring (`/dev-story`, `/code-review`) |
| **Tester** | Test plans, QA, bug triage (`/test-plan`, `/qa`) |
| **Documentation** | Docs, specs, reports (`/doc`, `/spec`) |

## Key commands

- `workflow-init` — initialize a new project (creates `bmad/` folder structure)
- `analyze-context` — take over an existing project
- `status` / `workflow-status` — display project dashboard
- `next` — proactively suggest the most logical next step
- `update-dashboard` — regenerate `dashboard.md` (and `master-dashboard.json` in monorepos)
- `add-knowledge` — ingest new documentation and apply it to role reference files

## Compatibility

Requires `mcp_v2`. Supports monorepos by scanning for multiple `bmad/` instances.

## Compatibility status

✅ Compatible — frontmatter is valid and all reference files are present.

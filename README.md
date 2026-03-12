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

- `init` — initialize a new project (creates `bmad/` folder structure)
- `analyze` — take over an existing project
- `status` — display project status
- `next [--auto]` — proactively suggest the next step (or execute it with --auto)
- `repair` — run the internal installer and verify the script environment (useful after skill updates)

## Compatibility

Requires `mcp_v2`. 

## Compatibility status

✅ Compatible — frontmatter is valid and all reference files are present.

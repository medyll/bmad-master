# bmad-method

Project orchestrator — your interface between you and the development workflow.  
Say what you want, BMAD handles the rest. No management overhead, no technical jargon.

## Quick Start

```
bmad-init my-project
bmad-continue
```

## Commands

| Command | What it does |
|---------|-------------|
| `bmad-init <project>` | Create project structure |
| `bmad-continue` | Implement stories, run tests, chain automatically |
| `bmad-status` | Display current state |
| `bmad-analyze` | Rebuild status from project state |
| `bmad-test` | Run unit and e2e tests |
| `bmad-audit` | Check code quality |
| `bmad-doc` | Generate docs and README |

## How It Works

BMAD automatically manages: **planning → sprints → stories → dev → test**

Roles (Developer, Designer, Architect, PM, Tester, Reviewer, Scrum Master) activate based on context. Each role has its own expertise file in `references/roles/`.

## README Templates

BMAD generates project READMEs at three levels (Simple, Intermediate, Advanced).  
Templates are in `references/readme-templates/` and `references/readme-template.md`.

## License

MIT

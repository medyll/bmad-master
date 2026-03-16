# BMAD Integration Guide — Non-Skill Platforms

Use this guide to integrate BMAD into tools that don't support the Claude skill system (OpenCode, Cursor, Windsurf, Continue, etc.).

## Option 1: Add to project CLAUDE.md

Copy the block below into your project's `CLAUDE.md` file:

```markdown
## Project Orchestration (BMAD)

This project uses BMAD for workflow management. The state is in `bmad/status.yaml`.

### Quick reference
- `node <path-to-bmad>/scripts/bmad.mjs init` — Initialize project structure
- `node <path-to-bmad>/scripts/bmad.mjs analyze` — Scan project, generate status.yaml
- `node <path-to-bmad>/scripts/bmad.mjs status` — Show current status
- `node <path-to-bmad>/scripts/bmad.mjs next` — Show next recommended action

### Workflow
1. Before starting work, read `bmad/status.yaml` to understand current phase and next action
2. After completing significant work, update `bmad/status.yaml` with new progress/phase/next_action
3. All generated artifacts go in `bmad/artifacts/`
4. Story IDs follow pattern S{sprint}-{seq:02d} (e.g. S1-01)
```

## Option 2: System prompt snippet

For tools that support custom system prompts, add:

```
You have access to a project orchestrator called BMAD. The project state is stored in bmad/status.yaml. Before starting any task, read this file to understand the current phase and next action. After completing work, update the file. Use `node scripts/bmad.mjs status` for a quick overview. All artifacts go in bmad/artifacts/.
```

## Option 3: Standalone CLI

Run BMAD directly from the terminal:

```bash
# Setup (once)
cd <your-project>
node ~/.claude/skills/bmad-master/scripts/bmad.mjs init

# Daily workflow
node ~/.claude/skills/bmad-master/scripts/bmad.mjs status
node ~/.claude/skills/bmad-master/scripts/bmad.mjs next
node ~/.claude/skills/bmad-master/scripts/bmad.mjs analyze
```

## Model-specific tips

| Model | Recommendation |
|-------|---------------|
| Claude Opus / Sonnet | Full skill system. All commands work. Use `--auto` freely. |
| GPT-5 / GPT-5-mini | Use Option 1 or 2. Script commands work. For model commands (plan, sprint, dev), provide the status.yaml schema as context. |
| Haiku / smaller models | Stick to script commands. Run model commands one at a time. Provide explicit examples in your CLAUDE.md. |
| OpenCode / Cursor | Use Option 1. The CLAUDE.md approach works across all AI coding tools. |

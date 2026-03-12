# BMAD Commands Reference

## All Commands Explained

### `bmad init`
**What:** Create a new project structure.
**Creates:** `bmad/` folder with `status.yaml`, `config.yaml`, `artifacts/`.
**When:** Starting a new project.
**Example:** `bmad init`

### `bmad analyze`
**What:** Analyze existing project and generate initial `status.yaml`.
**Creates:** `bmad/status.yaml` based on current code and files.
**When:** Joining an existing project.
**Example:** `bmad analyze`

### `bmad status`
**What:** Show current project status.
**Reads:** `bmad/status.yaml`.
**Prints:** Current phase, progress, next recommended action.
**Example:** `bmad status`

### `bmad next [--auto]`
**What:** Execute the next logical step.
**Without --auto:** Do one step, report, stop.
**With --auto:** Keep doing steps until done (no prompts).
**Example:** `bmad next` or `bmad next --auto`

### `bmad plan <type>`
**What:** Create a planning document.
**Types:** `prd` (Product Requirements), `spec` (Technical Spec), `arch` (Architecture).
**Creates:** `bmad/artifacts/plan-{type}-{date}.md`
**Example:** `bmad plan prd` or `bmad plan arch`

### `bmad sprint`
**What:** Create a sprint.
**Creates:** `bmad/artifacts/sprint-{date}.md`
**Example:** `bmad sprint`

### `bmad sprint story`
**What:** Add a story to current sprint.
**Creates:** `bmad/artifacts/stories/{story-id}.md`
**Example:** `bmad sprint story`

### `bmad dev story <id>`
**What:** Implement a specific story.
**Input:** Story ID (e.g., `S1-01`).
**Output:** Code changes, tests, commit.
**Example:** `bmad dev story S1-01`

### `bmad dev review`
**What:** Review code changes.
**Output:** Feedback, suggested fixes.
**Example:** `bmad dev review`

### `bmad test <type>`
**What:** Run tests.
**Types:** `unit` (unit tests), `e2e` (end-to-end tests).
**Output:** Test results, coverage report.
**Example:** `bmad test unit` or `bmad test e2e`

### `bmad audit [--code]`
**What:** Audit the codebase.
**Flag --code:** Check code quality only.
**Creates:** `bmad/artifacts/audit-{date}.md`
**Example:** `bmad audit` or `bmad audit --code`

### `bmad doc`
**What:** Generate documentation.
**Creates:** Files in `bmad/artifacts/docs/`
**Example:** `bmad doc`

### `bmad readme`
**What:** Generate a README for the project.
**Creates:** `README.md` in project root.
**Example:** `bmad readme`

### `bmad fix [--syntax]`
**What:** Fix issues in the code.
**Flag --syntax:** Fix syntax errors only.
**Output:** Code changes.
**Example:** `bmad fix` or `bmad fix --syntax`

---

## Flags

- `--auto`: Run continuously without prompts (continue until done or error).
- `--delay <seconds>`: Wait N seconds between steps (useful for rate-limiting).

---

## Output Location

All artifacts go to `bmad/artifacts/` or its subdirectories.

Example structure:
```
bmad/
├── status.yaml
├── config.yaml
└── artifacts/
    ├── prd.md
    ├── sprint-2026-03-12.md
    ├── stories/
    │   └── story-1.md
    ├── audit-2026-03-12.md
    └── docs/
        └── overview.md
```

---

## Decision Tree: What to Run Next?

1. **First time?** → `bmad init`
2. **Joining existing project?** → `bmad analyze`
3. **Want to see current status?** → `bmad status`
4. **Need a plan?** → `bmad plan prd` or `bmad plan arch`
5. **Want to organize work?** → `bmad sprint`
6. **Ready to code?** → `bmad dev story <id>`
7. **Need to test?** → `bmad test unit` or `bmad test e2e`
8. **Need to check code quality?** → `bmad audit`
9. **Need documentation?** → `bmad doc` or `bmad readme`

---

## Common Workflows

### Starting a new project
```
bmad init                    # Create structure
bmad plan prd               # Write product requirements
bmad plan arch              # Design architecture
bmad sprint                  # Create first sprint
bmad dev story S1-01        # Start first story
```

### Continuing an existing project
```
bmad status                 # Check where we are
bmad next                   # Get next step
bmad next --auto            # Auto-run next steps
```

### Shipping work
```
bmad dev story S1-02        # Implement story
bmad test unit              # Run tests
bmad audit --code           # Check code quality
bmad dev review             # Review changes
```

---

## What NOT to Do

- ❌ Don't invent commands that aren't listed here
- ❌ Don't guess what arguments mean
- ❌ Don't create files manually if the skill can do it
- ❌ Don't run `bmad next --auto` if you're unsure about the steps (use `bmad next` without --auto first)

---

## If Something Fails

- Check that `bmad/` folder exists (create with `bmad init` if needed)
- Check that `bmad/status.yaml` is readable
- Check that `bmad/artifacts/` directory exists
- Run `bmad status` to see current state
- Run `bmad next` (without --auto) to see what's supposed to happen

That's it. No "orchestrator roles", no "role detection", no "global rules".

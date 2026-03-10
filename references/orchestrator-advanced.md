# BMAD Orchestrator – Advanced Reference

## bmad add

Ingest a new piece of project knowledge (doc, spec, example, code snippet), evaluate scope, and propose updates to role reference files and `SKILL.md`.

Usage: `bmad-master add-knowledge` with a short description + attached resource (text or file).

Process:
1. **Intake & summarize** — parse knowledge, extract intent, keywords, affected domains.
2. **Map to roles** — score which `/references/` files are impacted.
3. **Propose updates** — for each role: a) summary of edits, b) exact snippets/patches, c) whether `SKILL.md` frontmatter should change.
4. **Validate conflicts** — surface contradictions as blockers.
5. **Review & apply** — present plan. On approval, apply edits + write `bmad/artifacts/knowledge-updates-{timestamp}.md`.

Outputs:
- Ranked list of affected role files with proposed diffs.
- Recommended `SKILL.md` metadata changes when new triggers/commands are needed.
- Changelog artifact: `bmad/artifacts/knowledge-updates-{timestamp}.md`.

Safety:
- Never modify production code or sensitive files without explicit approval.
- DB schema changes require an explicit migration plan; never auto-apply.
- Prefer appending a "Notes / Additions" section over wholesale rewrites.

Example flow:
```
User: bmad-master add-knowledge (attach auth-flow-v2.md)
Skill: Summarizes doc, lists affected roles (developer.md, architect.md, documentation.md),
       shows patch snippets, recommends adding auth triggers to SKILL.md frontmatter.
User: Approves patches.
Skill: Applies patches, writes knowledge-updates artifact, updates `status.yaml`.
```

---

## Global Instruction v3.1.0 — Single Source of Truth

All BMAD roles MUST follow these rules when producing or modifying artifacts.

### 1. Context Discovery
- Locate the active `bmad/` directory before any write. Use the nearest `bmad/` relative to current file or `--path` flag.
- In monorepos, prefix outputs with `[package-name]`.

### 2. Mandatory State Sync (Write-Then-Sync Loop)
After creating/modifying **any** artifact (story, sprint, PRD, architecture, tech-spec, audit, test plan, bug, README, status.yaml):
1. **Snapshot `status.yaml`**: run `node <skill-scripts-dir>/bmad.mjs snapshot [bmad-dir]` → saves timestamped history in `bmad/artifacts/history/`.
2. Update `status.yaml` (phases, artifacts, sprintsbmad sprint backlog progress).

Tester: update `qa` object with `test_plan`, `coverage`, `last_run`, `bugs`.

### 3. Role-Specific Data Mapping
| Role | Updates |
|------|---------|
| Analyst / PM / Architect | High-level phases and artifacts in `status.yaml` |
| Scrum Master / Developer | `sprints` + `backlog` entries and progress % |
| Tester | `bmad test plan` or `bmad test bugs` flows, QA state to `status.yaml` |
| Documentation | Register artifacts in the artifacts index |

### 4. Data Integrity & Style
- Strict YAML for `status.yaml`. Never overwrite unrelated keys; merge/append only.
- All comments and documentation in English.
- Update `status.yaml.recommendation` to next logical step after changes.

### 5. File Write Enforcement
Every artifact MUST be physically created/updated on disk using file creation/edit tools. **Never display file contents in chat** as a substitute for writing. If a file path is specified in a template (e.g., `bmad/artifacts/stories/{id}.md`), that file MUST exist on disk after the command.

Failure to follow these rules → present a corrective plan rather than silently writing state.



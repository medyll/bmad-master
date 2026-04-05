

---

## [Orchestrator — Claude Opus 4.6] — 2026-04-05 · New feature: conventions.md

Added `./bmad/conventions.md` — a persistent, append-only file for tracking project conventions discovered during development.

**Changes to SKILL.md:**
- Added `conventions.md` to the output files tree
- Added step 2b to the Role Activation Checklist: read `conventions.md` before acting
- Added full "Project Conventions" section with format, rules, and examples

**How it works:**
- Any role can append a convention when a pattern or decision emerges
- All roles read `conventions.md` at activation and respect listed conventions
- Convention changes are announced as breaking changes in `bmad-openspace.md`
- File is created on first convention entry, not at `bmad init`

---



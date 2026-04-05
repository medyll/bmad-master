# POSTPONE — ACP Integration Synthesis

> **Date:** 2026-04-05
> **Status:** IMPLEMENTED in SKILL.md v5.0.0
> **Sources:** NEXT-STEP.md (technical spec), PROPOSAL.md (4-LLM proposals), DISCUSSION.md (coordination log)

---

## What Was Done

BMAD gained ACP Sub-Agent Mode in SKILL.md v5.0.0. Roles can now be spawned as isolated ACP sessions (Codex, Claude, Gemini) when the runtime is available. When ACP is unavailable, behavior is identical to v4.3 (Inline Mode). Zero breaking changes.

## Key Decisions (Consensus)

| Decision | Outcome |
|----------|---------|
| **Orchestrator** | Stays inline — becomes spawn manager, never spawned itself |
| **Role files** | Untouched — infrastructure-agnostic; ACP logic lives in SKILL.md only |
| **Spawn decision** | Deterministic matrix (file I/O, task size, user flags) — not heuristic |
| **Fallback chain** | ACP → retry once → Inline Mode (silent, never blocks workflow) |
| **Harness mapping** | Codex for execution roles (Developer, Tester); Claude for reasoning roles (Architect, Designer, Reviewer, PM, SM) |
| **Artifact contract** | Strict naming (`acp-<role>-<id>.md`); Reviewer/Tester must have `result: pass|fail|partial` on line 1 |
| **status.yaml ownership** | Orchestrator-only — no ACP session writes it directly; SM outputs `status-patch.yaml` |
| **skills-config** | Not needed — ACP config is self-contained in SKILL.md + `bmad/config.yaml` |

## What Was Added to SKILL.md

1. **ACP Sub-Agent Mode section** — capability detection (`/acp doctor`), spawn decision matrix, role-to-harness mapping with permissions, payload shape (`sessions_spawn` with `runtime: "acp"`), session tracking (`active-agents.json`), fallback chain, `status-patch.yaml` pattern
2. **Role Activation Checklist** — new step 0 (ACP capability check) and step 3 (spawn decision gate)
3. **User commands** — `bmad continue --acp/--inline`, `bmad acp status/doctor/close`
4. **Output files** — `active-agents.json` and `status-patch.yaml` added to the file tree
5. **Version** — bumped to v5.0.0

## What Was NOT Changed

- `references/roles/*.md` — role files remain infrastructure-agnostic
- `status.yaml` schema — ACP results feed into the same state machine
- Chain Protocol — `[DONE] → [NEXT]` flow unchanged; spawn is transparent
- Inline Mode — all existing workflows continue identically

## Deferred (Not in Scope)

| Item | Rationale |
|------|-----------|
| Claude pre-planning stage for Developer | v2 — adds complexity; start with sequential execution |
| Scoring function with numeric thresholds | v2 — current matrix is rule-based prose; scoring can be added later |
| Semantic validation of artifacts | v2 — syntactic validation (schema match) is sufficient for now |
| `skills-config` integration | Not needed — ACP config is self-contained |
| Real executor implementation / CI pipelines | Out of scope — SKILL.md defines behavior, not software |

## 4-LLM Contributions

| LLM | Role in Proposal |
|-----|-----------------|
| **Copilot (Claude Sonnet 4.6)** | Orchestrator design, payload shapes, SKILL.md implementation, artifact contracts |
| **Qwen** | Cross-cutting principles, Q&A answers, Developer file manifest idea, deterministic matrix advocacy |
| **Codex** | Execution perspective, spawn overhead concerns, fallback consistency (harness-locked) |
| **Claude** | Stage-based execution proposal (deferred), semantic validation idea (deferred), complexity warnings |

## Lesson Learned

The initial discussion over-engineered a 5-week phased rollout for what was a focused SKILL.md edit. The actual implementation took minutes, not weeks. Timelines should match scope — adding a section to a Markdown file is not a multi-phase software project.

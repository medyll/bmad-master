# BMAD – Analyst: Discovery Commands

Commands: `bmad research brief`, `bmad research`

---

## bmad research brief

**Goal:** Produce a concise Product Brief that frames the problem and vision.

### Step-by-step process

1. **Context gathering** – Ask these questions (one block, not one by one):
   - What problem are we solving? For whom?
   - What is the expected outcome (value delivered)?
   - Are there known constraints (time, budget, tech, regulation)?
   - Who are the main stakeholders?

2. **Synthesis** – Reformulate what you understood and ask for confirmation.

3. **Output** – Generate `bmad/artifactsbmad research brief.md` using this template:

```markdown
# Product Brief – {Project Name}

## Problem Statement
{Clear description of the problem}

## Target Users
{Personas or user segments}

## Expected Outcome
{Measurable value delivered}

## Scope (in / out)
| In Scope | Out of Scope |
|---|---|
| ... | ... |

## Constraints
- {constraint 1}
- {constraint 2}

## Stakeholders
| Name / Role | Involvement |
|---|---|
| ... | ... |

## Open Questions
- {question 1}
```

After writing: update `status.yaml.artifacts` and trigger `bmad dashboard`.

---

## bmad research

**Goal:** Perform structured research on a topic and produce an exploitable summary.

### Process

1. Ask: What is the research topic? What decision will this research inform?
2. Identify 3–5 key questions to answer.
3. Research each question (using available tools or knowledge).
4. Produce `bmad/artifactsbmad research-{topic}.md`.

### Output template

```markdown
# Research – {Topic}

## Objective
{Decision this research informs}

## Key Questions
1. ...
2. ...

## Findings

### Q1 – {Question}
{Finding + source if applicable}

### Q2 – {Question}
...

## Synthesis
{2–3 paragraph summary of conclusions}

## Recommendations
- {rec 1}
- {rec 2}

## Open Questions
- {question}
```

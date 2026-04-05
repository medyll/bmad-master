# status.yaml Reference & Validation

## Complete Schema

```yaml
# BMAD Status — Single Source of Truth
project: my-project              # (required) string — project name
phase: development               # (required) one of: planning | development | testing | release
progress: 45                     # (required) integer 0-100
next_action: "Implement S1-02"   # (required) string — free text describing the next step
next_command: "bmad continue"    # (required) string — executable command (e.g. "bmad plan prd", "bmad sprint", "bmad continue", "bmad test unit")
next_role: "dev"                 # (required) string — one of: pm | architect | dev | reviewer | tester | scrum | designer
active_role: dev                 # (optional) one of: pm | architect | dev | reviewer | tester | scrum | designer

phases:                          # (required) exactly these 4 entries, in this order
  - name: planning
    status: done                 # (required) one of: done | in_progress | upcoming
  - name: development
    status: in_progress
  - name: testing
    status: upcoming
  - name: release
    status: upcoming

marketing:                       # (required) max 4 lines — marketing-facing project state
  - "Landing page copy ready for review"
  - "Feature X demo-ready for stakeholders"

product:                         # (required) max 4 lines — product-facing project state
  - "Core user flow implemented and tested"
  - "Settings page blocked on design review"

far_vision:                      # (required) max 4 lines — long-term strategic direction
  - "Multi-tenant support planned for Q3"
  - "Mobile app feasibility study next sprint"

artifacts:                       # (optional) keys are artifact names, values are status
  prd: done                      # one of: done | in_progress | missing
  architecture: done
  tech-spec: in_progress

sprints:                         # (optional) array of sprint objects
  - id: 1                        # integer — sprint number, starts at 1
    status: active               # one of: active | completed | planned
    stories: ["S1-01", "S1-02"]  # array of story IDs, pattern: S{sprint}-{seq:02d}
```

**Dimension rules:**
- `marketing`: What matters for external communication — demos, copy, launch readiness. Max 4 bullet points.
- `product`: What matters for product decisions — user flows, blockers, feature completeness. Max 4 bullet points.
- `far_vision`: Strategic direction beyond the current sprint — future features, long-term architecture, research. Max 4 bullet points.
- All three dimensions are **updated at the end of every action** alongside other status fields.

**Story ID format:** `S{sprint number}-{sequence:02d}`. Example: sprint 1, story 3 = `S1-03`. Sprint 12, story 1 = `S12-01`.

**When to update:** After every model command (end of action). At minimum update `active_role`, `next_action`, `next_command`, `next_role`, and the three dimensions. Update `progress` and `phase` when work meaningfully advances the project.

---

## YAML Formatting Rules (CRITICAL)

The status.yaml is frequently corrupted by bad formatting. Follow these rules **exactly**:

**Quoting:**
- ✅ Always double-quote string values that contain special chars: `:`, `#`, `{`, `}`, `[`, `]`, `,`, `&`, `*`, `?`, `|`, `-`, `<`, `>`, `=`, `!`, `%`, `@`, `\`
- ✅ Always double-quote `next_action`, `next_command`, and dimension entries (they often contain special chars)
- ✅ Bare words are OK for simple values: `phase: development`, `active_role: dev`
- ❌ Never use single quotes — always double quotes
- ❌ Never use block scalars (`>-`, `|-`) in status.yaml — use inline quoted strings only

**Indentation:**
- ✅ Always use exactly 2 spaces for indentation
- ❌ Never use tabs
- ❌ Never mix indentation levels

**Arrays:**
- ✅ List items use `- ` (dash + space) at the correct indent level
- ✅ Inline arrays for short lists: `stories: ["S1-01", "S1-02"]`
- ❌ Never leave a trailing comma in inline arrays

**Common mistakes to avoid:**
```yaml
# ❌ BAD — unquoted colon in value
next_action: Implement S1-02: add modal component

# ✅ GOOD
next_action: "Implement S1-02: add modal component"

# ❌ BAD — inconsistent indentation
phases:
  - name: planning
     status: done

# ✅ GOOD
phases:
  - name: planning
    status: done

# ❌ BAD — block scalar (will bleed or break)
marketing: >-
  Landing page ready

# ✅ GOOD
marketing:
  - "Landing page ready"

# ❌ BAD — missing quotes on special chars
far_vision:
  - Multi-tenant support: Q3 target

# ✅ GOOD
far_vision:
  - "Multi-tenant support: Q3 target"
```

**Post-write verification:** After every status.yaml write, re-read the file and check:
1. No YAML syntax errors (mismatched quotes, bad indentation)
2. All required fields present
3. `next_command` / `next_role` in sync

---

## Chain Protocol Validation Rules (CRITICAL)

**The Chain Protocol depends on `next_command` and `next_role` being in perfect sync.**

If they become inconsistent, the entire workflow breaks.

### Command-Role Mapping Table

| next_role | Valid next_command examples | Invalid (will break chain) |
|-----------|----------------------------|--------------------------|
| **pm** | `bmad plan prd`, `bmad plan spec` | `bmad continue` (dev command) |
| **architect** | `bmad plan arch`, `bmad analyze` | `bmad sprint` (scrum command) |
| **scrum** | `bmad sprint`, `bmad sprint story`, `bmad status` | `bmad plan prd` (pm command) |
| **dev** | `bmad continue`, `bmad dev story`, `bmad dev review`, `bmad fix` | `bmad plan prd` (pm command) |
| **tester** | `bmad test unit`, `bmad test e2e` | `bmad continue` (dev command) |
| **reviewer** | `bmad dev review`, `bmad audit` | `bmad test unit` (tester command) |
| **designer** | `bmad doc` | `bmad continue` (dev command) |

### Update Requirements

**What you MUST do:**
- ✅ Update `next_command`, `next_role`, AND `next_action` together (all three, every time)
- ✅ Validate: `next_role` matches the role that executes `next_command` (use table above)
- ✅ If uncertain, leave a `> Note:` explaining the decision

**What you MUST NOT do:**
- ❌ Set `next_command: "bmad continue"` with `next_role: "scrum"` (mismatch = broken chain)
- ❌ Leave `next_command` or `next_role` NULL
- ❌ Update only one field without the others
- ❌ Assume the next role will "figure it out"

### Hard Blocker Detection

If you detect inconsistency: **Stop and report as blocker.**
- "Inconsistent `next_command`/`next_role` detected" = hard blocker
- The chain cannot be trusted and must not continue
- Example: `next_role: "scrum"` but `next_command: "bmad continue"` (developer command)

---

## Quick Reference

**Essential fields that MUST be in sync:**
```yaml
next_action: "Implement S1-02"          # What (human-readable)
next_command: "bmad continue"           # How to execute (machine-readable)
next_role: "dev"                        # Who executes (must match next_command)
```

**Before updating status.yaml, ask:**
1. Does `next_role` have permission to run `next_command`? (Check table)
2. Are all three fields non-NULL?
3. Do they describe the same logical next step?

If all three answers are YES, update is safe. ✅

# BMAD – Analyst: Audit Command

**Trigger:** `bmad audit [--code | --arch | --security | --perf | --doc | --deps | --full] [--path <dir>]`

> Default (no flag): `--full` — scans the **entire project** from root.

> **Also triggered automatically** during `bmad init` when existing source code is detected (baseline audit). In that context, output file is `bmad/artifactsbmad audit-baseline-{YYYY-MM-DD}.md` and `status.yaml.audit.baseline` is set to `true`.

---

## Execution Phases

**1. Discovery** – Map the entire project:
- Detect monorepo vs single package (`packages/`, `apps/`, `pnpm-workspace.yaml`, `nx.json`, `turbo.json`)
- Identify all tech stacks per package/app
- Read `bmad/config.yaml` and `bmad/status.yaml` if present
- Parse `package.json`, lockfiles (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`)
- Detect CI/CD files (`.github/`, `Dockerfile`, `.gitlab-ci.yml`)
- Scan `.env*` files for exposure risks

**2. Analysis** – Run applicable modules (see table below)

**3. Synthesis** – Compute health score, build severity matrix, prioritize recommendations

**4. Output** – Write artifact, update `status.yaml`, auto-create stories for Critical findings

---

## Audit Modules

| Flag | Scope | Key Checks |
|------|-------|------------|
| `--code` | All source files | Complexity, duplication, dead code, anti-patterns, naming, TODO/FIXME count |
| `--arch` | Folder structure + imports | Layer separation, circular deps, coupling, scalability, module boundaries |
| `--security` | Auth, config, deps | OWASP Top 10, hardcoded secrets, `.env` exposure, unsafe deps, injection risks, CORS |
| `--perf` | Runtime + build | N+1, bundle size, missing indexes, cache misuse, unoptimized loops |
| `--doc` | Docs + comments | README coverage, JSDoc/TSDoc, stale docs, missing API docs, `bmad/` accuracy |
| `--deps` | `package.json` + lockfiles | Outdated packages, unused deps, duplicates, license conflicts, known CVEs |
| `--full` | Everything above | Complete 360° project audit |

---

## Severity Levels

| Level | Icon | Definition |
|-------|------|------------|
| Critical | 🔴 | Must fix before release. Security, data loss, or crash risk. |
| Major | 🟠 | Significant impact on quality, maintainability, or performance. |
| Minor | 🟡 | Good practice violation. Low immediate impact. |
| Info | 🔵 | Observation or suggestion. No action required. |

---

## Health Score Formula

```
score = 100 - (critical × 20) - (major × 8) - (minor × 2)
score = max(0, score)
```

---

## Output Artifact

**File:** `bmad/artifactsbmad audit-{type}-{YYYY-MM-DD}.md`

```markdown
# Audit Report – {type} – {YYYY-MM-DD}

## 🗺️ Project Map
- **Type**: Monorepo | Single Package
- **Packages detected**: api-core, web-client, shared-ui
- **Stacks**: Next.js 14, Fastify 4, Tailwind CSS
- **CI/CD**: GitHub Actions ✅ | Docker ✅
- **bmad/ present**: Yes | No

## 📊 Health Score: {N} / 100

| Severity    | Count |
|-------------|-------|
| 🔴 Critical |   N   |
| 🟠 Major    |   N   |
| 🟡 Minor    |   N   |
| 🔵 Info     |   N   |

## 🔴 Critical Findings

#### [AUDIT-001] – {Short title}
- **Module**: security | code | arch | perf | doc | deps
- **Package**: `apps/api` (or root for single package)
- **File**: `path/to/file.ts` (line N)
- **Issue**: Clear explanation.
- **Impact**: What breaks or degrades if unaddressed.
- **Fix**: Concrete action.
- **BMAD Action**: `bmad dev story AUDIT-001`

## 🟠 Major Findings
...

## 🟡 Minor Findings
...

## 🔵 Info
...

## ✅ Recommended Next Steps
1. `bmad dev story AUDIT-001` – {title}
2. `bmad plan arch` – {reason}
3. `bmad sprint` – include AUDIT findings in next sprint
```

---

## `status.yaml` Update

```yaml
audit:
  last_run: "{YYYY-MM-DD}"
  type: "full"
  baseline: true          # true if produced during workflow-init
  score: 72
  project_type: "monorepo"
  packages_scanned: ["apps/api", "apps/web", "packages/ui"]
  critical: 2
  major: 5
  minor: 8
  info: 12
  artifact: "bmad/artifactsbmad audit-full-{YYYY-MM-DD}.md"
  auto_stories_created: ["AUDIT-001", "AUDIT-002"]
```

---

## Profile Adaptation

| Profile | Behavior |
|---------|----------|
| **Senior** | Findings table + commands only. No explanations. |
| **Beginner** | Add "why it matters" for each finding. Link to relevant docs. |
| **ADHD** | Icons, short blocks, one finding per visual card, progress bar. |

#!/usr/bin/env node
/**
 * bmad.mjs — BMAD unified script runner + delay handler
 *
 * Usage:
 *   node bmad.mjs <command> [args]
 *
 * Commands:
 *   dashboard              Generate master-dashboard.json + master-dashboard.md
 *   snapshot [bmad-dir]    Snapshot bmad/status.yaml to artifacts/history/
 *   connector [bmad-dir]   Generate bmad/artifacts/connector.yml
 *   ui [bmad-dir]          Describe BMAD UI architecture via simple HTML descriptors
 *   wait [--ms <ms>]       Wait/delay handler for inter-task latency
 *   delay [--ms <ms>]      Alias for wait command
 *   ensure                 Register bmad:update-dashboard in package.json scripts
 *   install                Install required dependencies (js-yaml)
 */

import fs from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

// ---------------------------------------------------------------------------

class Bmad {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  log(tag, ...args) {
    console.log(`[bmad:${tag}]`, ...args);
  }

  err(tag, ...args) {
    console.error(`[bmad:${tag}]`, ...args);
  }

  pad(n) {
    return String(n).padStart(2, '0');
  }

  timestamp(d = new Date()) {
    return (
      `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}` +
      `-${this.pad(d.getHours())}${this.pad(d.getMinutes())}${this.pad(d.getSeconds())}`
    );
  }

  // ── Delay/Wait Handler ────────────────────────────────────────────────────────

  async delay(ms = 1000, logLevel = 'info') {
    if (logLevel === 'info' || logLevel === 'debug') {
      console.log(`[bmad:delay] ⏳ Waiting ${ms}ms...`);
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async wait(args) {
    let ms = 1000;
    let logLevel = 'info';
    let config = null;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--ms' && args[i + 1]) {
        ms = parseInt(args[i + 1], 10);
        i++;
      } else if (args[i] === '--config') {
        config = true;
      } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
BMAD Delay Handler

Usage:
  node bmad.mjs wait [--ms <milliseconds>]
  node bmad.mjs wait --config
  node bmad.mjs wait --help

Options:
  --ms <ms>      Wait for specified milliseconds (default: 1000)
  --config       Show delay configuration
  --help, -h     Show this help message

Examples:
  node bmad.mjs wait --ms 2000
  node bmad.mjs wait --config
        `);
        return;
      }
    }

    if (config) {
      try {
        const scriptDir = path.dirname(import.meta.url.replace('file:///', ''));
        const configPath = path.join(scriptDir, 'delay-config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const cfg = JSON.parse(configData);
        console.log('\n📋 BMAD Delay Configuration\n');
        console.log(JSON.stringify(cfg, null, 2));
        return;
      } catch (err) {
        console.warn(`⚠️  Could not load delay-config.json:`, err.message);
      }
    }

    await this.delay(ms, logLevel);
  }

  uiBlueprint() {
    return {
      overview: 'Single-page orchestrator workspace built with simple semantic HTML descriptors.',
      sections: [
        {
          id: 'app-shell',
          role: 'orchestrator',
          description: 'Global shell that holds navigation, status, and workspace.',
          html: '<div class="app-shell">',
        },
        {
          id: 'hero',
          role: 'marketing',
          description: 'Hero banner communicating progress and invites.',
          html: '<header class="hero">',
        },
        {
          id: 'nav',
          role: 'scrum-master',
          description: 'Primary navigation for phases, sprints, and stories.',
          html: '<nav class="main-nav">',
        },
        {
          id: 'dashboard-grid',
          role: 'orchestrator',
          description: 'KPI grid and blocker cards.',
          html: '<section class="dashboard-grid">',
        },
        {
          id: 'story-queue',
          role: 'developer',
          description: 'Story list with status chips.',
          html: '<section class="story-queue">',
        },
        {
          id: 'detail-pane',
          role: 'developer',
          description: 'Command pane for the active work item.',
          html: '<aside class="detail-pane">',
        },
        {
          id: 'activity-timeline',
          role: 'scrum-master',
          description: 'Timeline of recent commands and commits.',
          html: '<section class="activity-timeline">',
        },
        {
          id: 'footer',
          role: 'orchestrator',
          description: 'Global footer with metadata links.',
          html: '<footer class="global-footer">',
        },
      ],
      descriptors: [
        {
          name: 'story-card',
          description: 'Card summarizing a story and owner.',
          html: '<article class="story-card"><h3>Story</h3><p>Status</p></article>',
        },
        {
          name: 'command-row',
          description: 'Inline actions for planning/tests.',
          html: '<div class="command-row"><button>Plan</button><button>Test</button></div>',
        },
        {
          name: 'status-pill',
          description: 'Chip showing current state.',
          html: '<span class="status-pill">⚡ In progress</span>',
        },
      ],
      behavior: [
        {
          name: 'refresh-trigger',
          description: 'Refresh button for dashboard data.',
          html: '<button class="refresh">↻ Refresh</button>',
        },
        {
          name: 'quick-actions',
          description: 'Quick links to orchestrator commands.',
          html: '<div class="quick-actions"><a>Next</a><a>Connector</a></div>',
        },
        {
          name: 'story-details',
          description: 'Expanded view with commands.',
          html: '<div class="story-details"><h4>Story</h4><p>Summary</p></div>',
        },
      ],
    };
  }

  renderUiMarkdown(blueprint) {
    const generatedAt = new Date().toISOString();
    const lines = [
      '# BMAD UI Architecture',
      `> Generated: ${generatedAt}`,
      '',
      '## Layout Sections',
      '| Section | Role | Description | HTML descriptor |',
      '| --- | --- | --- | --- |',
    ];
    for (const section of blueprint.sections) {
      lines.push(`| ${section.id} | ${section.role} | ${section.description} | \`${section.html}\` |`);
    }
    lines.push('', '## UI Descriptors', '| Name | Description | HTML snippet |', '| --- | --- | --- |');
    for (const desc of blueprint.descriptors) {
      lines.push(`| ${desc.name} | ${desc.description} | \`${desc.html}\` |`);
    }
    lines.push('', '## Interaction Patterns', '| Name | Description | HTML snippet |', '| --- | --- | --- |');
    for (const item of blueprint.behavior) {
      lines.push(`| ${item.name} | ${item.description} | \`${item.html}\` |`);
    }
    lines.push(
      '',
      '## Usage',
      '- Run `bmad ui` to refresh this blueprint whenever layouts evolve.',
      '- Connector reads this file along with `references/ui-architecture.md`.',
    );
    return lines.join('\n') + '\n';
  }

  async loadYaml() {
    try {
      const require = createRequire(import.meta.url);
      return require('js-yaml');
    } catch {
      this.err('yaml', 'js-yaml not found — run: node bmad.mjs install');
      process.exit(1);
    }
  }

  // ── Walker ────────────────────────────────────────────────────────────────

  async walk(dir, results = []) {
    const SKIP = new Set(['node_modules', '.git', 'dist', 'build']);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (SKIP.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await this.walk(full, results);
      } else if (e.isFile() && e.name === 'status.yaml' && path.basename(path.dirname(full)) === 'bmad') {
        results.push(full);
      }
    }
    return results;
  }

  // ── YAML parsers ──────────────────────────────────────────────────────────

  parsePhase(content, YAML) {
    try {
      const data = YAML.load(content);
      if (data?.phases?.length) {
        const cur =
          data.phases.find(p => p.status === 'in_progress') ||
          data.phases.find(p => p.status !== 'upcoming') ||
          data.phases[0];
        return cur?.name ? String(cur.name) : 'Unknown';
      }
      if (typeof data?.phase === 'string') return data.phase;
      if (data?.phase?.name) return data.phase.name;
    } catch {}
    const m = content.match(/-\s*name:\s*(.+)\r?\n\s*status:\s*in_progress/);
    return m ? m[1].trim() : 'Unknown';
  }

  parseProgress(content, YAML) {
    try {
      const data = YAML.load(content);
      if (data?.progress != null) {
        return typeof data.progress === 'number' ? data.progress : Number(String(data.progress).replace(/\D/g, '')) || null;
      }
    } catch {}
    const m = content.match(/progress:\s*(\d{1,3})/);
    return m ? Number(m[1]) : null;
  }

  parseQaBugs(content, YAML) {
    try {
      const data = YAML.load(content);
      if (data?.qa?.bugs) {
        return Array.isArray(data.qa.bugs)
          ? data.qa.bugs.map(String)
          : String(data.qa.bugs).split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
      }
    } catch {}
    return [];
  }

  progressEmoji(p) {
    if (p == null) return '⚪';
    if (p >= 50) return '🟢';
    if (p >= 20) return '🟡';
    return '🔴';
  }

  // ── Commands ──────────────────────────────────────────────────────────────

  /**
   * install — install required npm dependencies
   */
  async install() {
    this.log('install', 'installing dependencies');
    for (const pkg of ['js-yaml']) {
      this.log('install', `installing ${pkg}...`);
      const res = spawnSync('npm', ['install', pkg, '--no-audit', '--no-fund'], {
        stdio: 'inherit',
        cwd: this.cwd,
      });
      if (res.status !== 0) {
        this.err('install', `failed to install ${pkg}`);
        process.exit(res.status || 1);
      }
    }
    this.log('install', 'done');
  }

  /**
   * ensure — register bmad:update-dashboard script in package.json
   */
  async ensure() {
    this.log('ensure', 'checking package.json');
    const pkgPath = path.join(this.cwd, 'package.json');
    const txt = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(txt);
    pkg.scripts = pkg.scripts || {};
    const target = 'node .github/skills/bmad-master/scripts/bmad.mjs dashboard';
    if (pkg.scripts['bmad:update-dashboard'] === target) {
      this.log('ensure', 'already set →', target);
      return;
    }
    pkg.scripts['bmad:update-dashboard'] = target;
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    this.log('ensure', 'package.json updated →', target);
  }

  /**
   * snapshot [bmadDir] — save a timestamped copy of status.yaml
   */
  async snapshot(bmadDir) {
    const dir = bmadDir ? path.resolve(bmadDir) : path.join(this.cwd, 'bmad');
    const statusPath = path.join(dir, 'status.yaml');
    const historyDir = path.join(dir, 'artifacts', 'history');

    try {
      await fs.access(statusPath);
    } catch {
      this.err('snapshot', `status.yaml not found at ${statusPath}`);
      process.exit(1);
    }

    const content = await fs.readFile(statusPath, 'utf8');
    const now = new Date();
    const ts = this.timestamp(now);
    const outPath = path.join(historyDir, `status-${ts}.md`);

    await fs.mkdir(historyDir, { recursive: true });

    const md = [
      `# Status Snapshot — ${ts}`,
      ``,
      `> **Source:** \`bmad/status.yaml\`  `,
      `> **Captured:** ${now.toISOString()}`,
      ``,
      '```yaml',
      content.trimEnd(),
      '```',
      ``,
    ].join('\n');

    await fs.writeFile(outPath, md, 'utf8');
    this.log('snapshot', 'saved →', path.relative(this.cwd, outPath));
  }

  /**
   * dashboard — scan repo and generate master-dashboard.json + .md
   */
  async dashboard() {
    const YAML = await this.loadYaml();
    const t0 = Date.now();
    this.log('dashboard', 'scanning', this.cwd);

    const statusFiles = await this.walk(this.cwd);
    this.log('dashboard', `found ${statusFiles.length} bmad/status.yaml file(s)`);
    if (!statusFiles.length) {
      this.log('dashboard', 'nothing to do');
      return;
    }

    const instances = [];
    for (const f of statusFiles) {
      try {
        const content = await fs.readFile(f, 'utf8');
        const pkgDir = path.dirname(path.dirname(f));
        const rel = path.relative(this.cwd, pkgDir).replace(/\\/g, '/');
        const pkgName = rel || path.basename(pkgDir) || path.basename(this.cwd);
        const phase = this.parsePhase(content, YAML);
        const progress = this.parseProgress(content, YAML);
        const bugs = this.parseQaBugs(content, YAML);
        const dashboardPath = path.relative(this.cwd, path.join(pkgDir, 'bmad', 'artifacts', 'dashboard.md'));
        instances.push({ package: pkgName, phase, progress, bugs, dashboardPath });
        this.log('dashboard', `${pkgName} phase=${phase} progress=${progress ?? 'N/A'} bugs=${bugs.length}`);
      } catch (e) {
        this.err('dashboard', 'failed to read', f, e.message);
      }
    }

    const syncDate = new Date().toISOString().slice(0, 10);

    // Markdown
    let md = `# 👑 BMAD Master Dashboard\n> **Scope:** Monorepo Root | **Total Instances:** ${instances.length} | **Sync:** ${syncDate}\n\n---\n\n`;
    md += '## 🏗️ Project Overview\n\n| Package | Phase | Progress | Status | Action |\n| :--- | :--- | :---: | :---: | :--- |\n';
    for (const i of instances) {
      const prog = i.progress != null ? `${i.progress}%` : 'N/A';
      const action = i.dashboardPath ? `[Open Dash](${i.dashboardPath.replace(/\\/g, '/')})` : '—';
      md += `| **${i.package}** | ${i.phase} | ${prog} | ${this.progressEmoji(i.progress)} | ${action} |\n`;
    }
    md += '\n---\n\n## ⚠️ Critical Issues (QA/Bugs)\n';
    const allBugs = instances.flatMap(i => i.bugs.map(b => `**${i.package}**: ${b}`));
    md += allBugs.length ? allBugs.map(b => `- [ ] ${b}`).join('\n') + '\n' : '- None recorded\n';
    md += '\n---\n\n## 🛠️ Global Actions\n';
    md += '- [🔄 Full Rescan](command:bmad.run?%5B%22dashboard%22%5D)\n';
    md += '- [➕ New Package](command:bmad.run?%5B%22init%22%5D)\n';

    // JSON
    const json = {
      sync: syncDate,
      generatedAt: new Date().toISOString(),
      totalInstances: instances.length,
      instances,
      criticalIssues: instances.flatMap(i => i.bugs.map(b => ({ package: i.package, bug: b }))),
      generatedMarkdown: md,
    };

    await fs.writeFile(path.join(this.cwd, 'master-dashboard.json'), JSON.stringify(json, null, 2) + '\n', 'utf8');
    this.log('dashboard', `done in ${Date.now() - t0}ms`);
  }

  async ui(bmadDir) {
    const dir = bmadDir ? path.resolve(bmadDir) : path.join(this.cwd, 'bmad');
    const artifactsDir = path.join(dir, 'artifacts');
    const outPath = path.join(artifactsDir, 'ui-architecture.md');
    const blueprint = this.uiBlueprint();
    await fs.mkdir(artifactsDir, { recursive: true });
    const md = this.renderUiMarkdown(blueprint);
    await fs.writeFile(outPath, md, 'utf8');
    this.log('ui', 'written →', path.relative(this.cwd, outPath));
  }

  /**
   * connector [bmadDir] [--rebuild] — generate bmad/artifacts/connector.yml
   */
  async connector(bmadDir) {
    const YAML = await this.loadYaml();
    const dir = bmadDir ? path.resolve(bmadDir) : path.join(this.cwd, 'bmad');
    const artifactsDir = path.join(dir, 'artifacts');
    const outPath = path.join(artifactsDir, 'connector.yml');

    // Read config + status
    let config = {};
    let status = {};
    try { config = YAML.load(await fs.readFile(path.join(dir, 'config.yaml'), 'utf8')) || {}; } catch {}
    try { status = YAML.load(await fs.readFile(path.join(dir, 'status.yaml'), 'utf8')) || {}; } catch {}

    // Scan actual artifact entries
    const scan = async (subdir, ext = '.md') => {
      try {
        const files = await fs.readdir(path.join(artifactsDir, subdir));
        return files.filter(f => f.endsWith(ext));
      } catch { return []; }
    };

    const [sprints, stories, tests, campaigns, discussions, history] = await Promise.all([
      scan('sprints'), scan('stories'), scan('tests'), scan('campaigns'), scan('discussions'),
      scan('history', '.md'),
    ]);

    const connector = {
      meta: {
        generated: new Date().toISOString(),
        bmad_version: '3.2.0',
        project: config.name || path.basename(this.cwd),
        root: 'bmad/',
      },
      dictionary: {
        keywords: {
          story:     'Atomic dev task. ID pattern: S{sprint}-{seq:02d}. Role: developer.',
          sprint:    'Time-boxed work batch. ID pattern: sprint-{N}. Role: scrum-master.',
          prd:       'Product Requirements Document. Role: pm.',
          arch:      'Architecture document. Role: architect.',
          audit:     'Codebase analysis report. Role: analyst.',
          dashboard: 'Live project status view. Auto-generated. Role: orchestrator.',
          connector: 'This file. Machine-readable project manifest. Role: orchestrator.',
        },
        rules: [
          'All file writes must be followed by a dashboard update.',
          'Story IDs follow pattern S{sprint_number}-{sequence:02d} (e.g. S1-03).',
          'Sprint files are named sprint-{N}.md (e.g. sprint-2.md).',
          'Audit baselines are named audit-baseline-{YYYY-MM-DD}.md.',
          'All text artifacts are written in English.',
          'status.yaml is the single source of truth for project phase state.',
          'connector.yml is regenerated automatically on every dashboard update.',
        ],
        naming: {
          story:    'S{sprint}-{seq:02d}',
          sprint:   'sprint-{N}',
          audit:    'audit-baseline-{YYYY-MM-DD}',
          campaign: '{slug}',
          history:  'status-{YYYYMMDDTHHmmss}',
        },
      },
      architecture: [
        {
          path: 'bmad/',
          role: 'orchestrator',
          description: 'BMAD project root',
          children: [
            { path: 'config.yaml',   type: 'file', description: 'Project metadata (name, stack, team)' },
            { path: 'status.yaml',   type: 'file', description: 'Current phase, artifacts state, sprint/backlog progress' },
            { path: 'dashboard.md',  type: 'file', description: 'Interactive project dashboard (auto-generated)' },
            {
              path: 'artifacts/',
              type: 'dir',
              description: 'All generated project artifacts',
              children: [
                { path: 'connector.yml',         type: 'file', role: 'orchestrator', description: 'Auto-discovery manifest' },
                { path: 'product-brief.md',      type: 'file', role: 'analyst',      status: status?.artifacts?.['product-brief'] ?? 'unknown' },
                { path: 'prd.md',                type: 'file', role: 'pm',           status: status?.artifacts?.prd ?? 'unknown' },
                { path: 'tech-spec.md',          type: 'file', role: 'pm',           status: status?.artifacts?.['tech-spec'] ?? 'unknown' },
                { path: 'architecture.md',       type: 'file', role: 'architect',    status: status?.artifacts?.architecture ?? 'unknown' },
                { path: 'positioning.md',        type: 'file', role: 'marketing',    status: status?.artifacts?.positioning ?? 'unknown' },
                { path: 'marketing-strategy.md', type: 'file', role: 'marketing',    status: status?.artifacts?.['marketing-strategy'] ?? 'unknown' },
                { path: 'launch-plan.md',        type: 'file', role: 'marketing',    status: status?.artifacts?.['launch-plan'] ?? 'unknown' },
                { path: 'sprints/',    type: 'dir', role: 'scrum-master', pattern: 'sprint-{N}.md',     entries: sprints },
                { path: 'stories/',   type: 'dir', role: 'developer',    pattern: 'S{sprint}-{seq}.md', entries: stories },
                { path: 'tests/',     type: 'dir', role: 'tester',       pattern: '{story-id}-test-plan.md', entries: tests },
                { path: 'campaigns/', type: 'dir', role: 'marketing',    pattern: '{slug}.md',          entries: campaigns },
                { path: 'discussions/', type: 'dir', role: 'orchestrator', pattern: '{topic}-{YYYY-MM-DD}.md', entries: discussions },
                { path: 'history/',   type: 'dir', role: 'orchestrator', pattern: 'status-{YYYYMMDDTHHmmss}.md', entries: history },
              ],
            },
          ],
        },
      ],
    };

    await fs.mkdir(artifactsDir, { recursive: true });
    const header = [
      '# BMAD Auto-Discovery Connector',
      `# Generated: ${connector.meta.generated}`,
      '# Do not edit manually — regenerate with: node bmad.mjs connector',
      '',
    ].join('\n');
    await fs.writeFile(outPath, header + YAML.dump(connector, { lineWidth: 120 }), 'utf8');
    this.log('connector', 'written →', path.relative(this.cwd, outPath));
  }
}

// ── CLI entry point ─────────────────────────────────────────────────────────

const [, , cmd, ...args] = process.argv;
const bmad = new Bmad();

const commands = {
  install:   () => bmad.install(),
  ensure:    () => bmad.ensure(),
  snapshot:  () => bmad.snapshot(args[0]),
  dashboard: () => bmad.dashboard(),
  connector: () => bmad.connector(args.find(a => !a.startsWith('--'))),
  wait:      () => bmad.wait(args),
  delay:     () => bmad.wait(args),  // Alias
};

if (!cmd || !commands[cmd]) {
  console.error(`Usage: node bmad.mjs <command> [args]\nCommands: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

commands[cmd]().catch(e => { console.error(e); process.exit(1); });

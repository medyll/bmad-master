#!/usr/bin/env node
/**
 * bmad.mjs — BMAD unified script runner + delay handler
 *
 * Usage:
 *   node bmad.mjs <command> [args]
 *
 * Commands:
 *   snapshot [bmad-dir]    Snapshot bmad/status.yaml to artifacts/history/
 *   connector [bmad-dir]   Generate bmad/artifacts/connector.yml
 *   wait [--ms <ms>]       Wait/delay handler for inter-task latency
 *   delay [--ms <ms>]      Alias for wait command
 *   install                Install required dependencies (js-yaml)
 *   repair                 Run installer and verify that all required components are present
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

  async delay(seconds = 1, logLevel = 'info') {
    const ms = seconds * 1000;
    if (logLevel === 'info' || logLevel === 'debug') {
      console.log(`[bmad:delay] ⏳ Waiting ${seconds}s...`);
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async wait(args) {
    let seconds = 1;
    let logLevel = 'info';
    let config = null;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--seconds' && args[i + 1]) {
        seconds = parseInt(args[i + 1], 10);
        i++;
      } else if (args[i] === '--config') {
        config = true;
      } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
            BMAD Delay Handler

            Usage:
              node bmad.mjs wait [--seconds <seconds>]
              node bmad.mjs wait --config
              node bmad.mjs wait --help

            Options:
              --seconds <s>  Wait for specified seconds (default: 1)
              --config       Show delay configuration
              --help, -h     Show this help message

            Examples:
              node bmad.mjs wait --seconds 2
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

    await this.delay(seconds, logLevel);
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
      const scriptDir = path.dirname(import.meta.url.replace('file:///', ''));
      // Prefer installing into the skill's scripts directory so require() resolves from here.
      let res = spawnSync('npm', ['install', pkg, '--no-audit', '--no-fund'], {
        stdio: 'inherit',
        cwd: scriptDir,
      });
      if (res.status !== 0) {
        this.err('install', `failed to install ${pkg} into ${scriptDir}; attempting project root fallback`);
        // Fallback: try installing into the caller's cwd (project root)
        res = spawnSync('npm', ['install', pkg, '--no-audit', '--no-fund'], {
          stdio: 'inherit',
          cwd: this.cwd,
        });
        if (res.status !== 0) {
          this.err('install', `failed to install ${pkg} in both scriptDir and project root`);
          process.exit(res.status || 1);
        }
      }
    }
    this.log('install', 'done');
  }

  /**
   * repair — ensure the script environment is healthy
   *
   * runs the installer and then attempts to load the yaml library,
   * exiting with a nonzero status if anything is still missing.
   */
  async repair() {
    this.log('repair', 'running environment repair');

    // warn if there is no package.json in cwd, since npm install will behave
    // differently in that situation. The user is expected to invoke this from
    // their project root where BMAD is used.
    try {
      const pkgPath = path.join(this.cwd, 'package.json');
      await fs.access(pkgPath);
    } catch {
      this.err(
        'repair',
        'no package.json found in current directory – run this from your project root'
      );
    }

    // If js-yaml is already resolvable from the script context, skip install.
    try {
      const require = createRequire(import.meta.url);
      require('js-yaml');
      this.log('repair', 'yaml dependency is present (skipping install)');
    } catch {
      // Not present where the script resolves modules — attempt install.
      await this.install();
      // attempt to require yaml just to validate
      try {
        await this.loadYaml();
        this.log('repair', 'yaml dependency is present');
      } catch (err) {
        this.err('repair', 'yaml check failed');
        process.exit(1);
      }
    }

    this.log('repair', 'repair complete');
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

  /**
   * generateReadme — create or update README.md from templates
   * level: 'simple' | 'intermediate' | 'advanced'
   */
  async generateReadme(level = 'simple') {
    try {
      const scriptDir = path.dirname(import.meta.url.replace('file:///', ''));
      // By default generate a single README containing three progressive
      // sections: Simple → Intermediate → Advanced. Each template is
      // placed under a named subsection. If a --level was provided it will
      // still be accepted but we include all 3 sections in the same document.
      const templatesDir = path.join(scriptDir, '..', 'references', 'readme-templates');
      const files = {
        simple: path.join(templatesDir, 'README.simple.md'),
        intermediate: path.join(templatesDir, 'README.intermediate.md'),
        advanced: path.join(templatesDir, 'README.advanced.md'),
      };

      const projectName = path.basename(this.cwd);

      const readTemplate = async (p) => {
        try {
          return await fs.readFile(p, 'utf8');
        } catch {
          return '';
        }
      };

      const tplSimple = await readTemplate(files.simple);
      const tplInter = await readTemplate(files.intermediate);
      const tplAdv = await readTemplate(files.advanced);

      // Helper: drop top-level title if present and replace placeholders
      const normalize = (tpl) => {
        let s = tpl || '';
        s = s.replace(/{{project_name}}/g, projectName).replace(/{{project_dir}}/g, this.cwd);
        // remove first line if it's a level-1 title
        s = s.replace(/^#\s.*\r?\n/, '');
        return s.trim();
      };

      const bodySimple = normalize(tplSimple);
      const bodyInter = normalize(tplInter);
      const bodyAdv = normalize(tplAdv);

      // Write the combined template to the skill's references folder so the
      // skill can use it as the canonical readme-template. Do NOT overwrite
      // the user's project README by default.
      const templateOut = path.join(path.dirname(import.meta.url.replace('file:///', '')), '..', 'references', 'readme-template.md');
      const parts = [
        `# {{project_name}}`,
        '',
        `> Auto-generated README template — includes three progressive levels: Simple → Intermediate → Advanced.`,
        '',
        '## Simple',
        '',
        bodySimple || '_No simple template available._',
        '',
        '---',
        '',
        '## Intermediate',
        '',
        bodyInter || '_No intermediate template available._',
        '',
        '---',
        '',
        '## Advanced',
        '',
        bodyAdv || '_No advanced template available._',
        '',
        '---',
        '',
        'Generated by BMAD',
      ].join('\n');

      await fs.writeFile(templateOut, parts, 'utf8');
      this.log('readme', `wrote template → ${path.relative(this.cwd, templateOut)}`);
    } catch (err) {
      this.err('readme', 'failed to generate README:', err.message);
      throw err;
    }
  }

  // Analyze the current project to collect basic facts used to pre-fill README
  async analyzeProject() {
    const info = {
      projectName: path.basename(this.cwd),
      languages: new Set(),
      hasPackageJson: false,
      hasRequirements: false,
      hasSrc: false,
      hasTests: false,
      installCommand: null,
      runCommand: null,
      testCommand: null,
      dependencies: [],
      packageScripts: {},
      description: null,
    };

    // package.json
    try {
      const pkgPath = path.join(this.cwd, 'package.json');
      const pj = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
      info.hasPackageJson = true;
      info.languages.add('JavaScript/Node');
      info.description = info.description || pj.description || null;
      info.packageScripts = pj.scripts || {};
      if (pj.dependencies) info.dependencies = Object.keys(pj.dependencies).slice(0, 10);
      if (info.packageScripts.start) info.runCommand = 'npm start';
      else if (info.packageScripts.dev) info.runCommand = 'npm run dev';
      else if (pj.main) info.runCommand = `node ${pj.main}`;
      info.installCommand = 'npm install';
    } catch {}

    // requirements.txt
    try {
      const reqPath = path.join(this.cwd, 'requirements.txt');
      const req = await fs.readFile(reqPath, 'utf8');
      info.hasRequirements = true;
      info.languages.add('Python');
      info.installCommand = info.installCommand || 'pip install -r requirements.txt';
      const deps = req.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 20);
      info.dependencies = info.dependencies.length ? info.dependencies.concat(deps) : deps;
    } catch {}

    // src/ and tests/
    try { await fs.access(path.join(this.cwd, 'src')); info.hasSrc = true; info.languages.add('Source files'); } catch {}
    try { await fs.access(path.join(this.cwd, 'tests')); info.hasTests = true; } catch {}
    try { await fs.access(path.join(this.cwd, 'test')); info.hasTests = true; } catch {}

    // test command heuristics
    if (!info.testCommand) {
      if (info.packageScripts && info.packageScripts.test) info.testCommand = 'npm test';
      else if (info.hasTests) info.testCommand = 'run your test suite (see tests/)';
    }

    return info;
  }

  // Fill the canonical readme-template.md with analysis and write a draft to artifacts/docs/
  async fillReadmeDraft(level = 'simple') {
    try {
      const scriptDir = path.dirname(import.meta.url.replace('file:///', ''));
      const templatePath = path.join(this.cwd, 'references', 'readme-template.md');
      // fallback to skill's template if project doesn't have one
      const fallback = path.join(scriptDir, '..', 'references', 'readme-template.md');
      let tpl;
      try { tpl = await fs.readFile(templatePath, 'utf8'); } catch { tpl = await fs.readFile(fallback, 'utf8'); }

      const info = await this.analyzeProject();

      // Basic replacements
      tpl = tpl.replace(/{{project_name}}/g, info.projectName || path.basename(this.cwd));
      tpl = tpl.replace(/{{project_dir}}/g, this.cwd);

      const installCmd = info.installCommand || '<install-command>';
      const runCmd = info.runCommand || '<run-command>';
      const exampleCmd = runCmd || (info.testCommand || '<example-command>');

      tpl = tpl.replace(/<install-command>/g, installCmd);
      tpl = tpl.replace(/<run-command>/g, runCmd);
      tpl = tpl.replace(/<example-command>/g, exampleCmd);

      // Append analysis summary at end of file
      const analysis = [
        '',
        '---',
        '',
        '## Auto Analysis',
        '',
        `- Detected languages: ${Array.from(info.languages).join(', ') || 'unknown'}`,
        `- Has package.json: ${info.hasPackageJson}`,
        `- Has requirements.txt: ${info.hasRequirements}`,
        `- Has src/: ${info.hasSrc}`,
        `- Has tests/: ${info.hasTests}`,
        `- Install command: ${installCmd}`,
        `- Run command: ${runCmd}`,
        `- Test command: ${info.testCommand || 'none detected'}`,
      ];

      if (info.dependencies && info.dependencies.length) analysis.push(`- Top dependencies: ${info.dependencies.slice(0,10).join(', ')}`);
      if (info.description) analysis.push('', `## Project Description`, '', info.description);

      const out = tpl + '\n' + analysis.join('\n');

      const outDir = path.join(this.cwd, 'bmad', 'artifacts', 'docs');
      await fs.mkdir(outDir, { recursive: true });
      const outPath = path.join(outDir, 'README.draft.md');
      await fs.writeFile(outPath, out, 'utf8');
      this.log('readme', `wrote draft → ${path.relative(this.cwd, outPath)}`);
      return outPath;
    } catch (err) {
      this.err('readme', 'failed to fill draft:', err.message);
      throw err;
    }
  }
}

// ── CLI entry point ─────────────────────────────────────────────────────────

// Robust CLI parsing — accept global flags anywhere (e.g.,  --delay <s>)
// and pass an options object to command handlers.
const raw = process.argv.slice(2);
const cmd = raw[0];
const args = raw.slice(1);
const opts = { delay: null };


const bmad = new Bmad();

const commands = {
  install:   (a,o) => bmad.install(a,o),
  repair:    (a,o) => bmad.repair(a,o),
  snapshot:  (a,o) => bmad.snapshot(a[0]),
  connector: (a,o) => bmad.connector(a.find(x => !x.startsWith('--'))),
  wait:      (a,o) => bmad.wait(a),
  delay:     (a,o) => bmad.wait(a),  // Alias
  readme:    (a,o) => {
    // parse --level
    let level = 'simple';
    let fill = false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === '--level' && a[i+1]) { level = a[i+1]; i++; }
      else if (a[i].startsWith('--level=')) { level = a[i].split('=')[1]; }
      else if (a[i] === '--fill') { fill = true; }
    }
    if (fill) return bmad.fillReadmeDraft(level);
    return bmad.generateReadme(level);
  },
  sprint:    async (a,o) => {
    // support: sprint story [--id <id>] [--level <level>]
    if (a[0] === 'story') {
      let id = `story-${Date.now()}`;
      let level = 'simple';
      for (let i = 1; i < a.length; i++) {
        if (a[i] === '--id' && a[i+1]) { id = a[i+1]; i++; }
        else if (a[i] === '--level' && a[i+1]) { level = a[i+1]; i++; }
        else if (a[i].startsWith('--level=')) { level = a[i].split('=')[1]; }
      }
      const dir = path.join(bmad.cwd, 'bmad', 'artifacts', 'stories');
      await fs.mkdir(dir, { recursive: true });
      const out = path.join(dir, `${id}.md`);
      const content = [`# Story ${id}`, '', `Generated: ${new Date().toISOString()}`, '', 'Summary: TODO', ''].join('\n');
      await fs.writeFile(out, content, 'utf8');
      bmad.log('sprint', `created story → ${path.relative(bmad.cwd, out)}`);
      await bmad.generateReadme(level);
      return;
    }
    bmad.log('sprint', 'no-op (use `sprint story`)');
  },
  dev: async (a,o) => {
    // support: dev story <id> [--level <level>]
    if (a[0] === 'story' && a[1]) {
      const id = a[1];
      let level = 'simple';
      for (let i = 2; i < a.length; i++) {
        if (a[i] === '--level' && a[i+1]) { level = a[i+1]; i++; }
        else if (a[i].startsWith('--level=')) { level = a[i].split('=')[1]; }
      }
      const dir = path.join(bmad.cwd, 'bmad', 'artifacts', 'stories');
      await fs.mkdir(dir, { recursive: true });
      const out = path.join(dir, `${id}.md`);
      const content = [`# Story ${id}`, '', `Implemented: ${new Date().toISOString()}`, '', 'Changes: TODO', 'Tests: TODO', ''].join('\n');
      await fs.writeFile(out, content, 'utf8');
      bmad.log('dev', `wrote story → ${path.relative(bmad.cwd, out)}`);
      await bmad.generateReadme(level);
      return;
    }
    bmad.log('dev', 'no-op (use `dev story <id>`)');
  },
};

if (!cmd || !commands[cmd]) {
  console.error(`Usage: node bmad.mjs <command> [args]\nCommands: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

commands[cmd](args, opts).catch(e => { console.error(e); process.exit(1); });

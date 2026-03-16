#!/usr/bin/env node
/**
 * bmad.mjs — BMAD unified script runner
 *
 * Usage:
 *   node bmad.mjs <command> [args]
 *
 * Commands:
 *   init [dir]             Create bmad/ project structure
 *   analyze [dir]          Analyze existing project → generate status.yaml
 *   status [dir]           Display current status from status.yaml
 *   next [dir]             Show next recommended action
 *   snapshot [dir]         Snapshot status.yaml to artifacts/history/
 *   connector [dir]        Generate bmad/artifacts/connector.yml
 *   readme [--fill] [--level <l>]  Generate README template or draft
 *   wait [--seconds <s>]   Wait/delay handler for inter-task latency
 *   delay [--seconds <s>]  Alias for wait
 *   install                Install required dependencies (js-yaml)
 *   repair                 Verify environment and fix issues
 *   config set <key> <val>  Set a skill reference override (e.g. theme, role ref)
 *   config get [key]        Show current config overrides
 *   config unset <key>      Remove an override
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  dateStamp(d = new Date()) {
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  }

  bmadDir(override) {
    return override ? path.resolve(override) : path.join(this.cwd, 'bmad');
  }

  // ── YAML loader ─────────────────────────────────────────────────────────

  async loadYaml() {
    try {
      const require = createRequire(import.meta.url);
      return require('js-yaml');
    } catch {
      this.err('yaml', 'js-yaml not found — run: node bmad.mjs install');
      process.exit(1);
    }
  }

  // ── Delay/Wait Handler ──────────────────────────────────────────────────

  async delay(seconds = 1) {
    const ms = seconds * 1000;
    console.log(`[bmad:delay] Waiting ${seconds}s...`);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async wait(args) {
    let seconds = 1;
    let config = false;

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
`);
        return;
      }
    }

    if (config) {
      try {
        const configPath = path.join(__dirname, 'delay-config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const cfg = JSON.parse(configData);
        console.log('\nBMAD Delay Configuration\n');
        console.log(JSON.stringify(cfg, null, 2));
        return;
      } catch (err) {
        console.warn(`Could not load delay-config.json:`, err.message);
      }
    }

    await this.delay(seconds);
  }

  // ── Walker ──────────────────────────────────────────────────────────────

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

  // ── YAML parsers ────────────────────────────────────────────────────────

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

  parseNextAction(content, YAML) {
    try {
      const data = YAML.load(content);
      if (data?.next_action) return String(data.next_action);
      if (data?.next) return String(data.next);
    } catch {}
    const m = content.match(/next(?:_action)?:\s*(.+)/);
    return m ? m[1].trim() : null;
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

  // ── Commands ────────────────────────────────────────────────────────────

  /**
   * init — create bmad/ project structure
   */
  async init(bmadDirOverride) {
    const dir = this.bmadDir(bmadDirOverride);

    try {
      await fs.access(path.join(dir, 'status.yaml'));
      this.log('init', `bmad/ already exists at ${dir}`);
      console.log('Use `bmad analyze` to refresh status from existing code.');
      return;
    } catch {}

    const artifactsDirs = [
      path.join(dir, 'artifacts', 'stories'),
      path.join(dir, 'artifacts', 'docs'),
      path.join(dir, 'artifacts', 'history'),
    ];

    for (const d of artifactsDirs) {
      await fs.mkdir(d, { recursive: true });
    }

    const projectName = path.basename(this.cwd);

    const statusYaml = `# BMAD Status — ${projectName}
# This file is the single source of truth for project state.

project: ${projectName}
phase: planning
progress: 0
next_action: "Create a PRD with bmad plan prd"

phases:
  - name: planning
    status: in_progress
  - name: development
    status: upcoming
  - name: testing
    status: upcoming
  - name: release
    status: upcoming

artifacts: {}

sprints: []
`;

    const configYaml = `# BMAD Config — ${projectName}

name: ${projectName}
created: "${new Date().toISOString()}"
stack: []
`;

    await fs.writeFile(path.join(dir, 'status.yaml'), statusYaml, 'utf8');
    await fs.writeFile(path.join(dir, 'config.yaml'), configYaml, 'utf8');

    this.log('init', `created bmad/ structure at ${path.relative(this.cwd, dir)}/`);
    console.log('  - status.yaml (project state)');
    console.log('  - config.yaml (project settings)');
    console.log('  - artifacts/ (output directory)');
    console.log('\nNext step: bmad plan prd');
  }

  /**
   * analyze — scan project and generate/update status.yaml
   */
  async analyze(bmadDirOverride) {
    const dir = this.bmadDir(bmadDirOverride);
    const info = await this.analyzeProject();

    await fs.mkdir(path.join(dir, 'artifacts'), { recursive: true });

    // Determine phase heuristically
    let phase = 'planning';
    let progress = 0;
    let nextAction = 'Create a PRD with bmad plan prd';

    if (info.hasSrc) {
      phase = 'development';
      progress = 30;
      nextAction = 'Review code and create sprint with bmad sprint';
    }
    if (info.hasTests) {
      progress = 50;
      nextAction = 'Run tests with bmad test unit';
    }

    // Check for existing artifacts
    const hasArtifacts = {};
    for (const name of ['prd.md', 'architecture.md', 'tech-spec.md']) {
      try {
        await fs.access(path.join(dir, 'artifacts', name));
        hasArtifacts[name.replace('.md', '')] = 'done';
      } catch {
        hasArtifacts[name.replace('.md', '')] = 'missing';
      }
    }

    const projectName = info.projectName || path.basename(this.cwd);

    const statusYaml = `# BMAD Status — ${projectName}
# Auto-generated by bmad analyze

project: ${projectName}
phase: ${phase}
progress: ${progress}
next_action: "${nextAction}"

detected:
  languages: [${Array.from(info.languages).map(l => `"${l}"`).join(', ')}]
  has_package_json: ${info.hasPackageJson}
  has_requirements_txt: ${info.hasRequirements}
  has_src: ${info.hasSrc}
  has_tests: ${info.hasTests}
  install_command: "${info.installCommand || 'N/A'}"
  run_command: "${info.runCommand || 'N/A'}"
  test_command: "${info.testCommand || 'N/A'}"
  top_dependencies: [${info.dependencies.slice(0, 8).map(d => `"${d}"`).join(', ')}]

phases:
  - name: planning
    status: ${phase === 'planning' ? 'in_progress' : 'done'}
  - name: development
    status: ${phase === 'development' ? 'in_progress' : 'upcoming'}
  - name: testing
    status: upcoming
  - name: release
    status: upcoming

artifacts:
${Object.entries(hasArtifacts).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

sprints: []
`;

    await fs.writeFile(path.join(dir, 'status.yaml'), statusYaml, 'utf8');
    this.log('analyze', `wrote status.yaml for "${projectName}"`);
    console.log(`  Phase: ${phase} | Progress: ${progress}%`);
    console.log(`  Languages: ${Array.from(info.languages).join(', ') || 'unknown'}`);
    console.log(`  Next: ${nextAction}`);
  }

  /**
   * status — read and display status.yaml
   */
  async status(bmadDirOverride) {
    const YAML = await this.loadYaml();
    const dir = this.bmadDir(bmadDirOverride);
    const statusPath = path.join(dir, 'status.yaml');

    let content;
    try {
      content = await fs.readFile(statusPath, 'utf8');
    } catch {
      this.err('status', `No status.yaml found at ${statusPath}`);
      console.log('Run `bmad init` or `bmad analyze` first.');
      process.exit(1);
    }

    const data = YAML.load(content);
    const phase = this.parsePhase(content, YAML);
    const progress = this.parseProgress(content, YAML);
    const nextAction = this.parseNextAction(content, YAML);
    const bugs = this.parseQaBugs(content, YAML);

    console.log(`\n[bmad] Project: ${data?.project || path.basename(this.cwd)}`);
    console.log(`  Phase:    ${phase}`);
    console.log(`  Progress: ${progress != null ? progress + '%' : 'unknown'}`);
    if (nextAction) console.log(`  Next:     ${nextAction}`);
    if (bugs.length) console.log(`  Bugs:     ${bugs.join(', ')}`);

    // Show artifacts summary
    if (data?.artifacts && typeof data.artifacts === 'object') {
      const entries = Object.entries(data.artifacts).filter(([, v]) => v && v !== 'missing');
      if (entries.length) {
        console.log(`  Artifacts: ${entries.map(([k, v]) => `${k}(${v})`).join(', ')}`);
      }
    }

    // Show sprints summary
    if (data?.sprints?.length) {
      console.log(`  Sprints:  ${data.sprints.length} defined`);
    }

    console.log('');
  }

  /**
   * next — show the next recommended action from status.yaml
   */
  async next(bmadDirOverride) {
    const YAML = await this.loadYaml();
    const dir = this.bmadDir(bmadDirOverride);
    const statusPath = path.join(dir, 'status.yaml');

    let content;
    try {
      content = await fs.readFile(statusPath, 'utf8');
    } catch {
      this.err('next', `No status.yaml found. Run bmad init first.`);
      process.exit(1);
    }

    const nextAction = this.parseNextAction(content, YAML);
    const phase = this.parsePhase(content, YAML);
    const progress = this.parseProgress(content, YAML);

    console.log(`\n[bmad] Phase: ${phase} | Progress: ${progress != null ? progress + '%' : '?'}`);
    if (nextAction) {
      console.log(`  Next action: ${nextAction}`);
    } else {
      console.log(`  No explicit next action defined in status.yaml.`);
      console.log(`  Suggestion: run bmad status for full overview.`);
    }
    console.log('');
  }

  /**
   * config — manage skill reference overrides
   * Stored in the skill's own references/overrides.json
   *
   * Supported keys:
   *   theme              Path to project CSS theme file
   *   role.<name>.ref    Extra reference file for a role
   *   role.<name>.prompt Additional prompt/context for a role
   */
  async configCmd(action, key, value) {
    const overridesPath = path.join(__dirname, '..', 'references', 'overrides.json');

    // Load existing overrides
    let overrides = {};
    try {
      overrides = JSON.parse(await fs.readFile(overridesPath, 'utf8'));
    } catch {}

    if (action === 'get') {
      if (key) {
        const val = this.getNestedKey(overrides, key);
        if (val !== undefined) {
          console.log(`${key} = ${typeof val === 'object' ? JSON.stringify(val, null, 2) : val}`);
        } else {
          console.log(`${key} is not set`);
        }
      } else {
        if (Object.keys(overrides).length === 0) {
          console.log('No overrides configured.');
        } else {
          console.log(JSON.stringify(overrides, null, 2));
        }
      }
      return;
    }

    if (action === 'set') {
      if (!key || value === undefined) {
        this.err('config', 'Usage: bmad config set <key> <value>');
        process.exit(1);
      }
      // Resolve relative paths to absolute for file references
      let resolvedValue = value;
      if (key === 'theme' || key.endsWith('.ref')) {
        const absPath = path.resolve(this.cwd, value);
        try {
          await fs.access(absPath);
          resolvedValue = absPath;
        } catch {
          this.err('config', `File not found: ${absPath}`);
          process.exit(1);
        }
      }
      this.setNestedKey(overrides, key, resolvedValue);
      await fs.writeFile(overridesPath, JSON.stringify(overrides, null, 2), 'utf8');
      this.log('config', `set ${key} = ${resolvedValue}`);
      return;
    }

    if (action === 'unset') {
      if (!key) {
        this.err('config', 'Usage: bmad config unset <key>');
        process.exit(1);
      }
      this.deleteNestedKey(overrides, key);
      await fs.writeFile(overridesPath, JSON.stringify(overrides, null, 2), 'utf8');
      this.log('config', `unset ${key}`);
      return;
    }

    console.error(`Unknown config action: ${action}\nUsage: bmad config <get|set|unset> [key] [value]`);
    process.exit(1);
  }

  // Helpers for nested dot-notation keys (e.g. "role.designer.ref")
  getNestedKey(obj, key) {
    return key.split('.').reduce((o, k) => o?.[k], obj);
  }

  setNestedKey(obj, key, value) {
    const parts = key.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  deleteNestedKey(obj, key) {
    const parts = key.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) return;
      cur = cur[parts[i]];
    }
    delete cur[parts[parts.length - 1]];
  }

  /**
   * install — install required npm dependencies
   */
  async install() {
    this.log('install', 'installing dependencies');
    for (const pkg of ['js-yaml']) {
      this.log('install', `installing ${pkg}...`);
      let res = spawnSync('npm', ['install', pkg, '--no-audit', '--no-fund'], {
        stdio: 'inherit',
        cwd: __dirname,
        shell: true,
      });
      if (res.status !== 0) {
        this.err('install', `failed in ${__dirname}; trying project root`);
        res = spawnSync('npm', ['install', pkg, '--no-audit', '--no-fund'], {
          stdio: 'inherit',
          cwd: this.cwd,
          shell: true,
        });
        if (res.status !== 0) {
          this.err('install', `failed to install ${pkg}`);
          process.exit(res.status || 1);
        }
      }
    }
    this.log('install', 'done');
  }

  /**
   * repair — ensure the script environment is healthy
   */
  async repair() {
    this.log('repair', 'running environment repair');

    try {
      await fs.access(path.join(this.cwd, 'package.json'));
    } catch {
      this.err('repair', 'no package.json in cwd — run from project root');
    }

    try {
      const require = createRequire(import.meta.url);
      require('js-yaml');
      this.log('repair', 'yaml dependency present (skipping install)');
    } catch {
      await this.install();
      try {
        await this.loadYaml();
        this.log('repair', 'yaml dependency installed successfully');
      } catch {
        this.err('repair', 'yaml check failed');
        process.exit(1);
      }
    }

    this.log('repair', 'repair complete');
  }

  /**
   * snapshot — save a timestamped copy of status.yaml
   */
  async snapshot(bmadDirOverride) {
    const dir = this.bmadDir(bmadDirOverride);
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
    this.log('snapshot', 'saved ->', path.relative(this.cwd, outPath));
  }

  /**
   * connector — generate bmad/artifacts/connector.yml
   */
  async connector(bmadDirOverride) {
    const YAML = await this.loadYaml();
    const dir = this.bmadDir(bmadDirOverride);
    const artifactsDir = path.join(dir, 'artifacts');
    const outPath = path.join(artifactsDir, 'connector.yml');

    let config = {};
    let status = {};
    try { config = YAML.load(await fs.readFile(path.join(dir, 'config.yaml'), 'utf8')) || {}; } catch {}
    try { status = YAML.load(await fs.readFile(path.join(dir, 'status.yaml'), 'utf8')) || {}; } catch {}

    const scan = async (subdir, ext = '.md') => {
      try {
        const files = await fs.readdir(path.join(artifactsDir, subdir));
        return files.filter(f => f.endsWith(ext));
      } catch { return []; }
    };

    const [stories, history] = await Promise.all([
      scan('stories'),
      scan('history', '.md'),
    ]);

    const connector = {
      meta: {
        generated: new Date().toISOString(),
        bmad_version: '4.0.0',
        project: config.name || path.basename(this.cwd),
        root: 'bmad/',
      },
      dictionary: {
        keywords: {
          story:     'Atomic dev task. ID pattern: S{sprint}-{seq:02d}.',
          sprint:    'Time-boxed work batch. ID pattern: sprint-{N}.',
          prd:       'Product Requirements Document.',
          arch:      'Architecture document.',
          audit:     'Codebase analysis report.',
          connector: 'This file. Machine-readable project manifest.',
        },
        rules: [
          'Story IDs follow pattern S{sprint_number}-{sequence:02d} (e.g. S1-03).',
          'Sprint files are named sprint-{N}.md.',
          'All text artifacts are written in English.',
          'status.yaml is the single source of truth for project phase state.',
        ],
        naming: {
          story:   'S{sprint}-{seq:02d}',
          sprint:  'sprint-{N}',
          audit:   'audit-{YYYY-MM-DD}',
          history: 'status-{YYYYMMDDTHHmmss}',
        },
      },
      architecture: [
        {
          path: 'bmad/',
          description: 'BMAD project root',
          children: [
            { path: 'config.yaml',  type: 'file', description: 'Project metadata' },
            { path: 'status.yaml',  type: 'file', description: 'Current phase and progress' },
            {
              path: 'artifacts/',
              type: 'dir',
              description: 'All generated project artifacts',
              children: [
                { path: 'connector.yml',    type: 'file', description: 'Auto-discovery manifest' },
                { path: 'prd.md',           type: 'file', status: status?.artifacts?.prd ?? 'unknown' },
                { path: 'tech-spec.md',     type: 'file', status: status?.artifacts?.['tech-spec'] ?? 'unknown' },
                { path: 'architecture.md',  type: 'file', status: status?.artifacts?.architecture ?? 'unknown' },
                { path: 'stories/',  type: 'dir', pattern: 'S{sprint}-{seq}.md', entries: stories },
                { path: 'history/',  type: 'dir', pattern: 'status-{timestamp}.md', entries: history },
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
    this.log('connector', 'written ->', path.relative(this.cwd, outPath));
  }

  /**
   * generateReadme — create README template in project's bmad/artifacts/docs/
   */
  async generateReadme() {
    try {
      const templatesDir = path.join(__dirname, '..', 'references', 'readme-templates');
      const files = {
        simple: path.join(templatesDir, 'README.simple.md'),
        intermediate: path.join(templatesDir, 'README.intermediate.md'),
        advanced: path.join(templatesDir, 'README.advanced.md'),
      };

      const projectName = path.basename(this.cwd);

      const readTemplate = async (p) => {
        try { return await fs.readFile(p, 'utf8'); } catch { return ''; }
      };

      const tplSimple = await readTemplate(files.simple);
      const tplInter = await readTemplate(files.intermediate);
      const tplAdv = await readTemplate(files.advanced);

      const normalize = (tpl) => {
        let s = tpl || '';
        s = s.replace(/{{project_name}}/g, projectName).replace(/{{project_dir}}/g, this.cwd);
        s = s.replace(/^#\s.*\r?\n/, '');
        return s.trim();
      };

      const bodySimple = normalize(tplSimple);
      const bodyInter = normalize(tplInter);
      const bodyAdv = normalize(tplAdv);

      // Write to project's bmad/artifacts/docs/, NOT back into the skill folder
      const outDir = path.join(this.cwd, 'bmad', 'artifacts', 'docs');
      await fs.mkdir(outDir, { recursive: true });
      const outPath = path.join(outDir, 'README.template.md');

      const parts = [
        `# ${projectName}`,
        '',
        `> Auto-generated README template — includes three progressive levels: Simple, Intermediate, Advanced.`,
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

      await fs.writeFile(outPath, parts, 'utf8');
      this.log('readme', `wrote template -> ${path.relative(this.cwd, outPath)}`);
    } catch (err) {
      this.err('readme', 'failed to generate README:', err.message);
      throw err;
    }
  }

  /**
   * analyzeProject — collect basic project facts
   */
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

    try {
      const pj = JSON.parse(await fs.readFile(path.join(this.cwd, 'package.json'), 'utf8'));
      info.hasPackageJson = true;
      info.languages.add('JavaScript/Node');
      info.description = pj.description || null;
      info.packageScripts = pj.scripts || {};
      if (pj.dependencies) info.dependencies = Object.keys(pj.dependencies).slice(0, 10);
      if (info.packageScripts.start) info.runCommand = 'npm start';
      else if (info.packageScripts.dev) info.runCommand = 'npm run dev';
      else if (pj.main) info.runCommand = `node ${pj.main}`;
      info.installCommand = 'npm install';
    } catch {}

    try {
      const req = await fs.readFile(path.join(this.cwd, 'requirements.txt'), 'utf8');
      info.hasRequirements = true;
      info.languages.add('Python');
      info.installCommand = info.installCommand || 'pip install -r requirements.txt';
      const deps = req.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 20);
      info.dependencies = info.dependencies.length ? info.dependencies.concat(deps) : deps;
    } catch {}

    try { await fs.access(path.join(this.cwd, 'src')); info.hasSrc = true; info.languages.add('Source files'); } catch {}
    try { await fs.access(path.join(this.cwd, 'tests')); info.hasTests = true; } catch {}
    try { await fs.access(path.join(this.cwd, 'test')); info.hasTests = true; } catch {}

    if (!info.testCommand) {
      if (info.packageScripts?.test) info.testCommand = 'npm test';
      else if (info.hasTests) info.testCommand = 'run your test suite (see tests/)';
    }

    return info;
  }

  /**
   * fillReadmeDraft — fill template with project analysis
   */
  async fillReadmeDraft() {
    try {
      const templatePath = path.join(this.cwd, 'bmad', 'artifacts', 'docs', 'README.template.md');
      const fallback = path.join(__dirname, '..', 'references', 'readme-template.md');
      let tpl;
      try { tpl = await fs.readFile(templatePath, 'utf8'); } catch { tpl = await fs.readFile(fallback, 'utf8'); }

      const info = await this.analyzeProject();

      tpl = tpl.replace(/{{project_name}}/g, info.projectName || path.basename(this.cwd));
      tpl = tpl.replace(/{{project_dir}}/g, this.cwd);

      const installCmd = info.installCommand || '<install-command>';
      const runCmd = info.runCommand || '<run-command>';
      const exampleCmd = runCmd || (info.testCommand || '<example-command>');

      tpl = tpl.replace(/<install-command>/g, installCmd);
      tpl = tpl.replace(/<run-command>/g, runCmd);
      tpl = tpl.replace(/<example-command>/g, exampleCmd);

      const analysis = [
        '', '---', '',
        '## Auto Analysis', '',
        `- Detected languages: ${Array.from(info.languages).join(', ') || 'unknown'}`,
        `- Has package.json: ${info.hasPackageJson}`,
        `- Has requirements.txt: ${info.hasRequirements}`,
        `- Has src/: ${info.hasSrc}`,
        `- Has tests/: ${info.hasTests}`,
        `- Install command: ${installCmd}`,
        `- Run command: ${runCmd}`,
        `- Test command: ${info.testCommand || 'none detected'}`,
      ];

      if (info.dependencies.length) analysis.push(`- Top dependencies: ${info.dependencies.slice(0, 10).join(', ')}`);
      if (info.description) analysis.push('', `## Project Description`, '', info.description);

      const out = tpl + '\n' + analysis.join('\n');
      const outDir = path.join(this.cwd, 'bmad', 'artifacts', 'docs');
      await fs.mkdir(outDir, { recursive: true });
      const outPath = path.join(outDir, 'README.draft.md');
      await fs.writeFile(outPath, out, 'utf8');
      this.log('readme', `wrote draft -> ${path.relative(this.cwd, outPath)}`);
      return outPath;
    } catch (err) {
      this.err('readme', 'failed to fill draft:', err.message);
      throw err;
    }
  }
}

// ── CLI entry point ─────────────────────────────────────────────────────────

const raw = process.argv.slice(2);
const cmd = raw[0];
const args = raw.slice(1);

const bmad = new Bmad();

const commands = {
  init:      (a) => bmad.init(a[0]),
  analyze:   (a) => bmad.analyze(a[0]),
  status:    (a) => bmad.status(a[0]),
  next:      (a) => bmad.next(a[0]),
  config:    (a) => bmad.configCmd(a[0], a[1], a.slice(2).join(' ') || undefined),
  install:   () => bmad.install(),
  repair:    () => bmad.repair(),
  snapshot:  (a) => bmad.snapshot(a[0]),
  connector: (a) => bmad.connector(a.find(x => !x.startsWith('--'))),
  wait:      (a) => bmad.wait(a),
  delay:     (a) => bmad.wait(a),
  readme:    (a) => {
    const fill = a.includes('--fill');
    if (fill) return bmad.fillReadmeDraft();
    return bmad.generateReadme();
  },
  sprint: async (a) => {
    if (a[0] === 'story') {
      let id = `story-${Date.now()}`;
      for (let i = 1; i < a.length; i++) {
        if (a[i] === '--id' && a[i + 1]) { id = a[i + 1]; i++; }
      }
      const dir = path.join(bmad.cwd, 'bmad', 'artifacts', 'stories');
      await fs.mkdir(dir, { recursive: true });
      const out = path.join(dir, `${id}.md`);
      const content = [`# Story ${id}`, '', `Generated: ${new Date().toISOString()}`, '', 'Summary: TODO', ''].join('\n');
      await fs.writeFile(out, content, 'utf8');
      bmad.log('sprint', `created story -> ${path.relative(bmad.cwd, out)}`);
      return;
    }
    bmad.log('sprint', 'no-op (use `sprint story`)');
  },
  dev: async (a) => {
    if (a[0] === 'story' && a[1]) {
      const id = a[1];
      const dir = path.join(bmad.cwd, 'bmad', 'artifacts', 'stories');
      await fs.mkdir(dir, { recursive: true });
      const outFile = path.join(dir, `${id}.md`);
      const content = [`# Story ${id}`, '', `Implemented: ${new Date().toISOString()}`, '', 'Changes: TODO', 'Tests: TODO', ''].join('\n');
      await fs.writeFile(outFile, content, 'utf8');
      bmad.log('dev', `wrote story -> ${path.relative(bmad.cwd, outFile)}`);
      return;
    }
    bmad.log('dev', 'no-op (use `dev story <id>`)');
  },
};

if (!cmd || !commands[cmd]) {
  console.error(`Usage: node bmad.mjs <command> [args]\nCommands: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

commands[cmd](args).catch(e => { console.error(e); process.exit(1); });

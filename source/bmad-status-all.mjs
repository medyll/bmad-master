/**
 * bmad-status-all.mjs
 * Scan all BMAD projects and write a full status report.
 * Output: artifacts/status.md + artifacts/status.txt
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  directoryArtifacts,
  loadConfig,
  walkForBmad,
  parseStatusYaml,
  writeLines,
} from './bmad-shared.mjs';

const timeStart = Date.now();

// ── Status label ─────────────────────────────────────────────────────────────

/** Map a numeric progress value to a status label. */
function labelForProgress(progress) {
  const n = Number.parseInt(progress, 10);
  if (n === 100)           return '[DONE]';
  if (n >= 80)             return '[OK]';
  if (n >= 50)             return '[WRN]';
  if (Number.isFinite(n))  return '[ACT]';
  return '[???]';
}

/** Map a status label to an emoji icon. */
function iconForStatus(status) {
  if (status === '[DONE]' || status === '[OK]') return '✅';
  if (status === '[WRN]')                       return '⚠️';
  if (status === '[ACT]')                       return '🔨';
  return '❓';
}

// ── Project reader ────────────────────────────────────────────────────────────

/**
 * Read status.yaml from a bmad/ directory and return a project info object.
 * Falls back to placeholder values when the file is missing or unparseable.
 *
 * @param {string} directoryBmad - Absolute path to the bmad/ directory
 */
async function readProjectStatus(directoryBmad) {
  const info = {
    name:       path.basename(path.dirname(directoryBmad)),
    path:       directoryBmad,
    phase:      '?',
    progress:   '?',
    status:     '[???]',
    nextAction: 'No status.yaml',
  };

  try {
    const content = await fs.readFile(path.join(directoryBmad, 'status.yaml'), 'utf8');
    const parsed  = parseStatusYaml(content);

    if (parsed.phase)      info.phase      = parsed.phase;
    if (parsed.progress)   info.progress   = parsed.progress;
    if (parsed.nextAction) info.nextAction = parsed.nextAction;

    info.status = labelForProgress(info.progress);
  } catch {
    // status.yaml missing or unreadable — return defaults
  }

  return info;
}

// ── Output writer ─────────────────────────────────────────────────────────────

/** Build and write status.md + status.txt from the collected results. */
async function writeOutputs(config, results) {
  const elapsed = Date.now() - timeStart;
  const header  = `**Scan paths:** ${config.scanPaths.length} | **Depth:** ${config.maxDepth} | **Found:** ${results.length}`;

  // Markdown table
  const md = [
    '## BMAD Status - Tous les projets', '',
    header, '',
    '| Project | Phase | % | Status | Next Action |',
    '|---------|-------|---|--------|-------------|',
    ...results.map(r =>
      `| ${iconForStatus(r.status)} ${r.name} | ${r.phase} | ${r.progress}% | ${r.status} | ${r.nextAction} |`
    ),
    '', `*${elapsed}ms*`, '',
  ];

  // Plain-text table
  const txt = [
    'BMAD Status',
    `Found ${results.length} projects in ${elapsed}ms`, '',
    ...results.map(r =>
      `${iconForStatus(r.status)} ${r.name.padEnd(25)} ${`${r.progress}%`.padStart(5)} ${r.status.padEnd(7)} ${r.phase}`
    ),
    '',
  ];

  await writeLines(path.join(directoryArtifacts, 'status.md'),  md);
  await writeLines(path.join(directoryArtifacts, 'status.txt'), txt);
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const config          = await loadConfig();
  const directoriesBmad = [];

  for (const scanPath of config.scanPaths) {
    await walkForBmad(scanPath, config.maxDepth, directoriesBmad);
  }

  if (directoriesBmad.length === 0) {
    console.error('No BMAD projects found');
    process.exitCode = 1;
    return;
  }

  const results = await Promise.all(directoriesBmad.map(readProjectStatus));
  results.sort((a, b) => a.path.localeCompare(b.path));

  await writeOutputs(config, results);

  console.log(`Status saved to: ${path.join(directoryArtifacts, 'status.md')}`);
  console.log(`            and: ${path.join(directoryArtifacts, 'status.txt')}`);
  console.log(`Completed in ${Date.now() - timeStart}ms`);
}

await main();
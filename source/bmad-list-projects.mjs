/**
 * bmad-list-projects.mjs
 * Scan all BMAD projects and write a lightweight project list.
 * Output: artifacts/list.md + artifacts/list.txt
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

// ── Icon helper ───────────────────────────────────────────────────────────────

/** Map a progress string (e.g. '75%') to an emoji icon. */
function iconForProgress(progress) {
  if (progress === '100%')                       return '✅';
  if (progress !== '?' && progress !== '0%')     return '🔨';
  return '❓';
}

// ── Project reader ────────────────────────────────────────────────────────────

/**
 * Read status.yaml from a bmad/ directory and return a lightweight info object.
 * Only extracts phase and progress (no next_action or status label).
 *
 * @param {string} directoryBmad - Absolute path to the bmad/ directory
 */
async function readProjectInfo(directoryBmad) {
  const directoryProject = path.dirname(directoryBmad);
  const info = {
    name:     path.basename(directoryProject),
    path:     directoryProject,
    phase:    '?',
    progress: '?',
  };

  try {
    const content = await fs.readFile(path.join(directoryBmad, 'status.yaml'), 'utf8');
    const parsed  = parseStatusYaml(content);

    if (parsed.phase)    info.phase    = parsed.phase;
    if (parsed.progress) info.progress = `${parsed.progress}%`;
  } catch {
    // status.yaml missing or unreadable — return defaults
  }

  return info;
}

// ── Output writer ─────────────────────────────────────────────────────────────

/** Build and write list.md + list.txt from the collected results. */
async function writeOutputs(config, results) {
  const elapsed = Date.now() - timeStart;
  const header  = `**Scan paths:** ${config.scanPaths.length} | **Depth:** ${config.maxDepth} | **Found:** ${results.length}`;

  // Markdown table
  const md = [
    '## BMAD Projects', '',
    header, '',
    '| Nom | Phase | Progress | Path |',
    '|-----|-------|----------|--------|',
    ...results.map(r =>
      `| ${iconForProgress(r.progress)} ${r.name} | ${r.phase} | ${r.progress} | ${r.path} |`
    ),
    '', `*${elapsed}ms*`, '',
  ];

  // Plain-text list
  const txt = [
    'BMAD Projects List',
    `Found ${results.length} projects in ${elapsed}ms`, '',
    ...results.map(r =>
      `${iconForProgress(r.progress)} ${r.name.padEnd(25)} ${r.progress.padEnd(6)} ${r.path}`
    ),
    '',
  ];

  await writeLines(path.join(directoryArtifacts, 'list.md'),  md);
  await writeLines(path.join(directoryArtifacts, 'list.txt'), txt);
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

  const results = await Promise.all(directoriesBmad.map(readProjectInfo));
  results.sort((a, b) => a.path.localeCompare(b.path));

  await writeOutputs(config, results);

  console.log(`List saved to: ${path.join(directoryArtifacts, 'list.md')}`);
  console.log(`         and: ${path.join(directoryArtifacts, 'list.txt')}`);
  console.log(`Completed in ${Date.now() - timeStart}ms`);
}

await main();
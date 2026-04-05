/**
 * bmad-shared.mjs
 * Shared utilities for bmad-status-all and bmad-list-projects.
 * Provides: config loading, directory walker, path constants.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Paths ────────────────────────────────────────────────────────────────────

export const directoryCurrent = path.dirname(fileURLToPath(import.meta.url));
export const directoryArtifacts = path.resolve(directoryCurrent, '..', 'artifacts');
const fileConfig = path.join(directoryCurrent, 'bmad-config.json');

// ── Excluded directories (never walked) ──────────────────────────────────────

export const directoriesExcluded = new Set([
  'node_modules', '.git', 'vendor', 'dist', 'build', 'target', 'bin', 'obj',
  '.vscode', '.idea', 'coverage', '__pycache__',
]);

// ── Config ───────────────────────────────────────────────────────────────────

function defaultConfig() {
  return {
    scanPaths: ['D:\\boulot\\dev'],
    maxDepth: 8,
  };
}

/**
 * Load bmad-config.json. Falls back to defaultConfig() on any error.
 * @returns {{ scanPaths: string[], maxDepth: number }}
 */
export async function loadConfig() {
  try {
    const content = await fs.readFile(fileConfig, 'utf8');
    const parsed = JSON.parse(content);
    return {
      scanPaths: Array.isArray(parsed.scanPaths) && parsed.scanPaths.length > 0
        ? parsed.scanPaths
        : defaultConfig().scanPaths,
      maxDepth: Number.isInteger(parsed.maxDepth) ? parsed.maxDepth : defaultConfig().maxDepth,
    };
  } catch {
    return defaultConfig();
  }
}

// ── Directory walker ─────────────────────────────────────────────────────────

/**
 * Recursively find all `bmad/` directories under directoryRoot.
 * Stops recursion when entry.name === 'bmad' or depth >= maxDepth.
 * Skips excluded directories.
 *
 * @param {string}   directoryRoot  - Directory to scan
 * @param {number}   maxDepth       - Maximum recursion depth
 * @param {string[]} results        - Accumulator (mutated in place)
 * @param {number}   [depthCurrent] - Current depth (internal, starts at 0)
 */
export async function walkForBmad(directoryRoot, maxDepth, results, depthCurrent = 0) {
  let entries;
  try {
    entries = await fs.readdir(directoryRoot, { withFileTypes: true });
  } catch {
    return; // unreadable directory — skip silently
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (directoriesExcluded.has(entry.name)) continue;

    const directoryEntry = path.join(directoryRoot, entry.name);

    if (entry.name === 'bmad') {
      results.push(directoryEntry);
      continue; // don't recurse inside bmad/
    }

    if (depthCurrent >= maxDepth) continue;

    await walkForBmad(directoryEntry, maxDepth, results, depthCurrent + 1);
  }
}

// ── YAML field extraction ─────────────────────────────────────────────────────

/**
 * Extract key fields from a raw status.yaml string via regex.
 * Returns null for any field that cannot be matched.
 *
 * @param {string} content - Raw YAML text
 * @returns {{ phase: string|null, progress: string|null, nextAction: string|null }}
 */
export function parseStatusYaml(content) {
  const matchPhase    = content.match(/(?:current_phase|phase):\s*["']?([^"'\n#]+)/);
  const matchProgress = content.match(/progress:\s*(\d+)/);
  const matchNext     = content.match(/next_action:\s*["']?([^"'\n]+)/);

  return {
    phase:      matchPhase    ? matchPhase[1].trim()    : null,
    progress:   matchProgress ? matchProgress[1]        : null,
    nextAction: matchNext     ? matchNext[1].trim()     : null,
  };
}

// ── Output helpers ────────────────────────────────────────────────────────────

/**
 * Write an array of lines to a file, joined with '\n'.
 * Creates parent directories as needed.
 *
 * @param {string}   filePath
 * @param {string[]} lines
 */
export async function writeLines(filePath, lines) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, lines.join('\n'), 'utf8');
}

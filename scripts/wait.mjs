import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, 'delay-config.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  try {
    const data = await readFile(configPath, 'utf8');
    const { total_duration_seconds, steps } = JSON.parse(data);
    const intervalMs = Math.max(0, Math.floor((total_duration_seconds * 1000) / (steps.length || 1)));
    for (const msg of steps) {
      console.log(`[DELAY] ${msg}`);
      await sleep(intervalMs);
    }
    process.exit(0);
  } catch (error) {
    // Fail loudly so calling processes can react
    console.error('[DELAY] error:', error && error.message ? error.message : String(error));
    process.exit(1);
  }
}

await run();

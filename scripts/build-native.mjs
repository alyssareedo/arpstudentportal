// Builds the app bundle for the native (iOS / Android) shell.
//
// Why this script exists: Vite gives real environment variables priority over
// .env files. Some machines (including this project's sandbox) already have
// VITE_SUPABASE_* set to the OLD backend, and that would silently win over
// .env.native — shipping a store build pointed at the wrong database.
//
// This script loads .env.native directly into the build's environment, so the
// values in that file always win, on any machine.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const envFile = new URL('../.env.native', import.meta.url);
const raw = readFileSync(envFile, 'utf8');

const applied = [];
for (const line of raw.split('\n')) {
  if (line.trim().startsWith('#')) continue;
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m) continue;
  process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  applied.push(m[1]);
}

console.log(`[build:native] forcing values from .env.native: ${applied.join(', ')}`);
console.log(`[build:native] database -> ${process.env.VITE_SUPABASE_URL}`);

const result = spawnSync('npx', ['vite', 'build'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);

// Release safety check for the native build.
//
// capacitor.config.ts carries a `server.url` pointing at a temporary sandbox
// preview so developers can hot-reload on a phone. If that line survives into a
// store build, the published app depends on an address that will stop working.
//
// Run before every store upload:  npm run check:release
import { readFileSync } from 'node:fs';

const config = readFileSync(new URL('../capacitor.config.ts', import.meta.url), 'utf8');

// A `url:` entry inside the server block = remote loading = NOT a store build.
const serverBlock = config.match(/server:\s*\{([\s\S]*?)\}/)?.[1] ?? '';
const hasRemoteUrl = /^\s*url:\s*['"`]https?:\/\//m.test(serverBlock);

if (hasRemoteUrl) {
  console.error(
    '\n\d7 RELEASE CHECK FAILED\n' +
      '  capacitor.config.ts still loads the app from a preview address.\n' +
      '  Open capacitor.config.ts and delete the `url:` line inside `server:`,\n' +
      '  then run:  npm run sync:native\n' +
      '  The app will then use its own bundled copy from dist/.\n',
  );
  process.exit(1);
}

console.log('\u2713 Release check passed: the app loads its own bundled copy from dist/.');

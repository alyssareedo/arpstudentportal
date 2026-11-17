import type { CapacitorConfig } from '@capacitor/cli';

/**
 * arpstudentportal — native shell configuration
 *
 * STANDALONE MODE
 * ---------------
 * There is no `server.url` — the app loads its own copy of the site from the
 * `dist/` folder that `npm run build:native` produces, so it works fully
 * self-contained on the phone (APK testing and store releases).
 *
 * If you ever add a temporary `server.url` for hot-reload development, remove
 * it before building for the stores. `npm run check:release` fails loudly
 * while that line is present.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.p4952020916ad4edf8721e7d5e08f8e11',
  appName: 'arpstudentportal',
  webDir: 'dist',
  server: {
    // Standalone mode: the app loads its own bundled copy of the site from
    // `dist/` (built with `npm run build:native`). No live preview address —
    // safe for APK testing and store releases.
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
  },
};

export default config;

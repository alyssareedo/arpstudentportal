import type { CapacitorConfig } from '@capacitor/cli';

/**
 * arpstudentportal — native shell configuration
 *
 * HOT RELOAD (development only)
 * -----------------------------
 * `server.url` below points at the live sandbox preview so the app on your
 * phone/emulator reloads the moment the code changes. This is a TEMPORARY
 * development address.
 *
 * ⚠️  BEFORE YOU BUILD FOR GOOGLE PLAY OR THE APP STORE
 *     delete the `url:` line (keep `cleartext: true`). If you ship it, the
 *     published app will stop working the moment that preview address expires,
 *     and Apple/Google reviewers will see a blank screen.
 *     `npm run check:release` will fail loudly if the line is still there.
 *
 * With the `url:` line removed, the app loads its own copy of the site from
 * the `dist/` folder that `npm run build:native` produces — fully self-contained.
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

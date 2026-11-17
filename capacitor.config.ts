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
    // ⚠️ REMOVE THIS LINE BEFORE A STORE BUILD — see note at the top of this file.
    url: 'https://49520209-16ad-4edf-8721-e7d5e08f8e11.lovableproject.com?forceHideBadge=true',
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

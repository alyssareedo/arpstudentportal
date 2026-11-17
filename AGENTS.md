# ARP Student Portal — standing rules

- Save every schema or access-rule change as a migration file, never as one-off SQL run only
  against the live database. The user intends to move this app onto a database they own, and a
  change that exists only live would silently make that copy looser or older than the running
  app. If a change has to be applied directly, write the equivalent migration file in the same
  turn and note which migration covers it.
- Build the phone apps with `npm run build:native`, never plain `vite build`. A machine's real
  environment variables outrank `.env` files, and this sandbox injects the old backend address,
  so only the explicit override in `scripts/build-native.mjs` guarantees a store build points at
  the database the user owns.
- Run `npm run check:release` before any store upload. `capacitor.config.ts` deliberately carries
  a temporary preview address so the app hot-reloads during development; shipping it leaves a
  published app depending on an address that expires.
- Test APKs are built by `.github/workflows/build-apk.yml` (debug build via `build:native`), so APK testing never needs a local Android toolchain.

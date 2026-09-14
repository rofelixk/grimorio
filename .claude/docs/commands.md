## Commands

```bash
npm start          # dev server (ng serve)
npm run build      # production build -> dist/grimorio/browser
npm run watch      # dev build with rebuild on change
npm test           # unit tests (Vitest, via `ng test`)
npm run lint       # ESLint (angular-eslint) over src/
```

Run a single test file: `npx ng test --include='**/home.spec.ts'` (glob is relative to the project root, matching Vitest's `include` semantics).

### Running as a desktop PWA

```bash
npm run serve:pwa   # production build, then serves dist/grimorio/browser (needed for the service worker to register)
```

Open the printed `http://localhost:8080` URL in Edge or Chrome and use the browser's install affordance (address-bar install icon, or app menu → "Install Grimorio") to install it as a standalone windowed app. The service worker only activates in production builds served over HTTP(S) — it's inert under `ng serve`/`npm start`.

### Building the Android app

Requires Android Studio installed locally (bundles the JDK, Android SDK, and Gradle needed below) — see https://developer.android.com/studio.

```bash
npm run cap:build   # ng build, then `cap sync android` (copies dist/grimorio/browser into android/)
npm run cap:sync    # `cap sync android` only, without rebuilding the web app first
npm run cap:open    # opens the android/ project in Android Studio
```

To produce an installable `.apk` from the CLI instead of Android Studio:

```bash
cd android && ./gradlew assembleDebug   # Windows: gradlew.bat assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Debug builds are self-signed automatically, so this can be sideloaded directly — copy it to the phone and open it (Files app or a browser download); Android will prompt to allow "install unknown apps" for that one source. This does **not** require enabling Developer Mode/USB debugging, which is a separate, unrelated setting.

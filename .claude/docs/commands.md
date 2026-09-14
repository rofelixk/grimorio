## Commands

```bash
npm start          # dev server (ng serve)
npm run build      # production build -> dist/grimorio/browser
npm run watch      # dev build with rebuild on change
npm test           # unit tests (Vitest, via `ng test`)
npm run lint       # ESLint (angular-eslint) over src/
```

Run a single test file: `npx ng test --include='**/home.spec.ts'` (glob is relative to the project root, matching Vitest's `include` semantics).

### Testing on a phone

Browser camera capture (`getUserMedia`/file input) requires a secure context, so a plain LAN URL (`http://<lan-ip>:4200`) won't work from a phone browser:

```bash
npm run start:phone    # ng serve with live-reload disabled
npm run start:tunnel   # opens a Cloudflare quick tunnel (no account) to localhost:4200
```

Run both (in separate terminals) and open the tunnel's `https://*.trycloudflare.com` URL on the phone. `start:phone` disables live-reload because the dev server's reconnect-triggered full page reload otherwise fires whenever the tab is backgrounded (e.g. to use the camera app), wiping in-progress state. The tunnel's wildcard host is allowlisted via `allowedHosts` in `angular.json`'s `serve` target.

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

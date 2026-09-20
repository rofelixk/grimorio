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

See the `android-build` skill for building/syncing the Capacitor Android app and producing an installable `.apk`.

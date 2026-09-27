## Commands

```bash
npm start          # dev server (ng serve)
npm run build      # production build -> dist/grimorio/browser
npm run watch      # dev build with rebuild on change
npm test           # unit tests (Vitest, via `ng test`)
npm run lint       # ESLint (angular-eslint) over src/
```

Run a single test file: `npx ng test --include='**/home.spec.ts'` (glob is relative to the project root, matching Vitest's `include` semantics).

### Card data (maintainer-run)

```bash
npm run sync:scryfall    # refresh the Supabase card catalog from Scryfall bulk data
npm run sync:planechase  # regenerate src/app/core/data/planechase/cards.json from the catalog
```

Both read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env`. Run `sync:scryfall` before `sync:planechase`. After `sync:planechase` reports missing or outdated translations, run the `planechase-translate` skill (`/planechase-translate`) to update `cards.pt-br.json` and review its output before committing. Excluded sets live in `EXCLUDED_SETS` in `scripts/sync-planechase.ts`.

### Running as a desktop PWA

```bash
npm run serve:pwa   # production build, then serves dist/grimorio/browser (needed for the service worker to register)
```

Open the printed `http://localhost:8080` URL in Edge or Chrome and use the browser's install affordance (address-bar install icon, or app menu → "Install Grimorio") to install it as a standalone windowed app. The service worker only activates in production builds served over HTTP(S) — it's inert under `ng serve`/`npm start`.

### Building the Android app

See the `android-build` skill for building/syncing the Capacitor Android app and producing an installable `.apk`.

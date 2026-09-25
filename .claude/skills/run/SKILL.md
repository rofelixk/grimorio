---
description: Drive Grimorio's running Angular dev server in headless Chromium via Playwright to verify a UI change actually works.
---

# Running Grimorio

Angular 22 zoneless SPA on `ng serve` (port 4200); the only backend is hosted
Supabase (catalog reads, optional cloud accounts). `chromium-cli` is not
installed in this environment, so drive the app with a plain Playwright script
instead (installed as a local npm dependency in the scratchpad, not added to
the project's own `package.json`).

## Dev server

The user keeps `npm start` running themselves. Never start, stop or kill
anything on port 4200. Check that it's up:

```bash
curl -sf http://localhost:4200/ >/dev/null && echo up || echo down
```

If it's down, ask the user to start it rather than launching one.

## Drive it (Playwright, no chromium-cli)

One-time setup per machine (installs the actual browser binary, not just
the npm package):

```bash
cd <scratchpad>
npm init -y >/dev/null 2>&1
npm install playwright >/dev/null 2>&1
npx playwright install chromium
```

Then write a small `.mjs` driver script to the scratchpad and run it with
`node`:

```js
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
page.on('console', (msg) => { if (msg.type() === 'error') console.error(msg.text()); });
page.on('pageerror', (err) => console.error('pageerror:', err.message));

await page.goto('http://localhost:4200/');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'shots/01-home.png' });
// ...fill/click/waitForSelector/screenshot per interaction...
await browser.close();
```

Run: `node verify-ui.mjs`. Screenshots land wherever the script's `path:`
points — use a `shots/` subfolder in the scratchpad and **Read** the PNGs
back to actually look at them (a passing selector wait doesn't prove the
page rendered correctly).

## Getting past the profile gate

Owned-data routes (`/collection*`, `/decks*`) are gated by `profileGuard`:
with no active profile, navigating there opens the entry modal instead. Each
Playwright launch is a fresh browser context with empty IndexedDB, so a script
that visits a gated page must create a local profile first. Steps (all UI copy
is PT-BR, from `core/utils/entry-copy.ts`):

1. Navigate to a gated route (e.g. `/collection`) or click the top-bar
   profile button — the entry modal opens.
2. Fill `Nome do perfil` (3–20 chars: letters, digits, `_ . -`) and `Senha`
   (≥ 8 chars).
3. Pick 1–3 colors in the identity wheel (swatch buttons, labelled by color
   name via `aria-label`).
4. Click `Criar perfil`, then dismiss the success panel.

Prefer `getByLabel`/`getByRole` with these PT-BR strings over CSS selectors.
If the flow changes, re-read `entry-copy.ts` and `shared/auth/entry-modal/`
rather than guessing. Cloud-account flows hit the real Supabase project — don't
script sign-up/sign-in unless the user asks.

## Verifying UI changes

Check at both mobile (393×852, ~9:19.5) and desktop (1440×900) viewports —
wait for `networkidle` plus ~500ms so lazy-loaded card images are settled
before screenshotting, and check that modals still close and buttons don't
wrap at either width. This catches the class of regression (CSS specificity
losses, `display:flex` overriding a close path, overflow clipping a ring) that
a screenshot at only one viewport, or taken too early, misses.

## Gotchas hit so far

- No `chromium-cli` in this environment — don't spend time looking for
  it, go straight to the plain-Playwright pattern above.
- First `npx playwright install chromium` downloads ~115MB; expect it to
  take a minute or two on a cold machine.
- PBKDF2 at 600k iterations makes profile creation/unlock take ~1 s — wait
  for the modal's success state instead of a fixed sleep.

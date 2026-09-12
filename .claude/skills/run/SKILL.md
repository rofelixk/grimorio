---
description: Launch Grimorio's Angular dev server and drive it in headless Chromium via Playwright to verify a UI change actually works.
---

# Running Grimorio

Angular 22 zoneless SPA, no backend — `ng serve` on port 4200. `chromium-cli`
is not installed in this environment, so drive the app with a plain
Playwright script instead (installed as a local npm dependency in the
scratchpad, not added to the project's own `package.json`).

## Dev server

Start:

```bash
cd /d/Usuario/Projetos/Dev/Apps/grimorio
npm start &
timeout 30 bash -c 'until curl -sf http://localhost:4200/ >/dev/null; do sleep 1; done'
```

Stop (Windows has no `lsof`; use `netstat` + `taskkill` instead of
`lsof -ti:PORT | xargs kill`):

```bash
netstat -ano | grep ':4200' | grep LISTENING | awk '{print $5}' | sort -u \
  | xargs -r -I{} taskkill //F //PID {}
```

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
`node`. Shape that worked for verifying the location-first card entry flow:

```js
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') console.error(msg.text()); });
page.on('pageerror', (err) => console.error('pageerror:', err.message));

await page.goto('http://localhost:4200/');
await page.waitForSelector('text=Locations');
await page.screenshot({ path: 'shots/01-home.png' });
// ...fill/click/waitForSelector/screenshot per interaction...
await browser.close();
```

Run: `node verify-ui.mjs`. Screenshots land wherever the script's `path:`
points — use a `shots/` subfolder in the scratchpad and **Read** the PNGs
back to actually look at them (a passing selector wait doesn't prove the
page rendered correctly).

## Gotchas hit so far

- No `chromium-cli` in this environment — don't spend time looking for
  it, go straight to the plain-Playwright pattern above.
- No `lsof`/`pkill` on Windows — use `netstat -ano | grep LISTENING` +
  `taskkill //F //PID`.
- First `npx playwright install chromium` downloads ~115MB; expect it to
  take a minute or two on a cold machine.
- The app is a single-user, no-auth local tool — no login flow to script.

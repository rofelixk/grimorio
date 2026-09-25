# Quickstart: validating spec 004 (App Shell Navigation)

## Prerequisites

- Branch `feature/004-app-shell-navigation`, with dependencies installed (`npm install`).
- A dev server started by you (`npm start`, port 4200). Browser checks can be scripted with the `run` skill
  (Playwright against the running server).
- For the sync scenarios: a local profile linked to a Supabase cloud account, and a second, unlinked profile.

## Automated checks

```bash
npm run lint
npm test
npx ng test --include='**/sync-status.util.spec.ts'   # every FR-007 row + time boundaries
npx ng test --include='**/sync.service.spec.ts'       # single-flight, 60 s timeout, no auto-trigger
npx ng test --include='**/shell-state.service.spec.ts' # pin persistence + storage failure
npx ng test --include='**/nav-drawer.spec.ts'         # close-before-modal, focus return
npx ng test --include='**/entry-flow.util.spec.ts'    # 3–16 name rule
```

Expected results:

- Everything passes.
- `grep -rn "syncNow(" src/app --include=*.ts` (excluding specs) finds calls only in `sync.service.ts` and
  `sync-status.service.ts` (SC-011).
- `SyncScheduler`, `ProfileButton`, `NavBar`, `SyncLine`, `TOP_BAR` and `SYNC` no longer exist.

## Manual / browser validation

Run each scenario at **1280×800** (wide) and **360×740** (narrow) unless it says otherwise.

| # | Scenario | Expected |
|---|---|---|
| V1 | Load Home with no profile | Wide: wordmark + "Entrar", no sync status, collapsed thread with the Coleção bead. Narrow: wordmark + Menu, and the drawer shows "Nenhum perfil ativo" + Entrar. |
| V2 | Activate a profile whose name is 16 characters | The name shows in full: in the top bar (wide), and in the drawer at 320px wide. The dots follow pick order. |
| V3 | Tap the profile control | The modal opens at "Trocar de perfil" (switch / sign out). Switching updates the control at once. |
| V4 | Hover the collapsed nav (wide) | It expands over the content. Measure a content element's `getBoundingClientRect()` before and after: identical (SC-007). It collapses about 120 ms after the pointer leaves, with no flicker when the pointer crosses the edge quickly. |
| V5 | Pin, reload, switch profile | It stays pinned, and the content narrows with nothing covered. In a private window with storage blocked, it starts collapsed and pinning still works for the session. |
| V6 | Open `/collection/import` and a location detail | "Coleção" is marked current (`aria-current="page"`). |
| V7 | Narrow: Menu → Coleção | The collection opens and the drawer closes. Menu → profile: the drawer closes, the modal opens, and after closing the modal focus is on Menu. |
| V8 | Narrow drawer keyboard | Tab stays inside the drawer. Esc closes it and focus returns to Menu. Keyboard open focuses ✕. There is never a sideways scroll (`document.scrollingElement.scrollLeft === 0`). |
| V9 | Open the modal via the profile gate (`/collection` with no profile) | The top bar, the nav and the page don't respond to click, hover or Tab. |
| V10 | Resize or rotate across 960px with the drawer open | No backdrop remains, and the wide layout applies the stored pin choice. |
| V11 | Linked profile: add a card, switch profiles, unlock, link | No network sync request fires (DevTools Network, filtered on `storage_locations`/`card_entries`) (SC-011). |
| V12 | Trigger sync (wide area / drawer action) | Sincronizando… (the profile control is dimmed and locked) → Sincronizado → after 5 min, "Sincronizado há 5 min", with the minute count updating. |
| V13 | Go offline (DevTools) → sync | "Sem conexão" in danger color, "Tentar de novo" retries. Reload: it shows "Sincronizado há …" again (failures are session-only). |
| V14 | Throttle the network to stall a request → sync | It ends in "Falha ao sincronizar" (or "Sem conexão") within 60 s, and the profile control unlocks. |
| V15 | Unlinked profile | "Sem conta na nuvem". Activating it (wide) or "Vincular conta na nuvem" (drawer) opens the modal at the cloud sign-in step. |
| V16 | Red-identity profile, synced state | Nothing in the shell uses the danger color. The status marks are neutral. |
| V17 | Scroll a long page to the end | The top bar and the nav stay put. `document.documentElement.scrollTop === 0`, and the notice is last in `<main>`. On a short page (Home), the notice sits at the bottom of the view. |
| V18 | Navigate from a scrolled page to another | `<main>` starts at scrollTop 0. |
| V19 | Notice links | Fan Content Policy and Scryfall open in a new tab. Their hit areas are ≥ 44px tall. The About page shows the same WotC/Scryfall text. |
| V20 | Reduced motion (DevTools emulation) | The bands are static and the drawer opens and closes instantly. |
| V21 | Create a profile with a 17-character name | "Use de 3 a 16 caracteres." The field is not truncated. |
| V22 | Every shell control at 320px | ≥ 44px tall, and no overflow or overlap (SC-002, SC-003). |

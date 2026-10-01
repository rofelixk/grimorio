# Research: Reactivity & Timing Audit

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-10-01

This file is the audit's verdict list (FR-003, US4). The decisions that follow (R1–R9) explain the five changes and the promise fixes.

## R0. Inventory count

- **Decision**: The inventory has **38** call sites, not 39: 12 one-shot timers, 3 repeating timers, 15 effects, 5 after-render effects and 3 router-event subscriptions.
- **Rationale**: The spec's timer list names 12 sites (side-nav, sweep-loop ×2, planar-preview ×2, planar-tile, fluid-height, toast.service, sync.service, entry-flow.store, legacy-cleanup, core/testing/cross-tab), and `grep` over non-spec `src/` files finds the same 12. The "13" was a miscount, and the spec's FR-002 and SC-002 are corrected to 12 and 38.
- **How it was taken**: `grep -rnE "\bsetTimeout\(|\bsetInterval\(|\beffect\(|afterRenderEffect\(|\.events\.subscribe"` over `src/**/*.ts`, excluding `*.spec.ts`. `requestAnimationFrame`, `afterNextRender` and `queueMicrotask` are out of scope (FR-004). The count is checked again at the start of `/speckit-implement`.

## Verdict list

The verdict counts are 7 convert or remove (five changes) and 31 keep. "Kind" is: **T** one-shot timer, **I** repeating timer, **E** effect, **A** after-render effect, **R** router-event subscription.

### One-shot timers (12)

| # | Location | Purpose | Verdict | Reason / replacement |
|---|----------|---------|---------|----------------------|
| T1 | `shared/layout/side-nav/side-nav.ts` `onPointerLeave` | Collapse the nav 120 ms after the pointer leaves | **keep** | Hover delay: the duration is the behavior (`--delay-nav-leave`). |
| T2 | `shared/effects/page-sweep/sweep-loop.ts` `start`, no-host branch | End the change after `SWEEP_MS` when no host is attached | **remove** | The host can't be absent once `SweepLoop` injects it (R2). The branch and its timer go. |
| T3 | `shared/effects/page-sweep/sweep-loop.ts` `start`, first frame | Fire `onCrossed` `SWEEP_MS` after the first frame | **convert** | It stands in for the end of the rAF-driven front. **Replacement**: `step()` fires `onCrossed` on the first frame whose elapsed time reaches `SWEEP_MS` (R1). |
| T4 | `views/planechase-deck/planar-preview.controller.ts` `hoverTile` | Open the popover after 300 ms of rest | **keep** | Hover delay (FR-005 of spec 006). |
| T5 | `views/planechase-deck/planar-preview.controller.ts` `scheduleClose` | Close the popover 150 ms after leaving | **keep** | Hover grace delay (FR-006 of spec 006). |
| T6 | `shared/gameplay/planar-tile/planar-tile.ts` `onPointerDown` | A touch held for 500 ms opens the preview | **keep** | Press delay: the duration is the gesture. |
| T7 | `shared/ds/fluid-height.ts` `measure` | Clear `is-resizing` if no height `transitionend` comes | **keep (fallback)** | Paired with the face's `transitionend` listener. The transition may never run: a height clamped by `max-height` starts none, and reduced motion is excluded upstream. `transitioncancel` isn't used because an interrupted resize starts a new transition, and the class must stay through it (R6). |
| T8 | `core/services/toast.service.ts` `show` | Dismiss after 5 s | **keep** | Visible duration (FR-022 of spec 004). |
| T9 | `core/services/sync.service.ts` `timedExchange` | Bound a sync at `SYNC_TIMEOUT_MS` | **keep** | Network timeout. Pending item #39 (sync) stays out of scope. |
| T10 | `shared/auth/entry-modal/entry-flow.store.ts` `delay` | "Saindo…" shows for at least 700 ms | **keep** | Visible minimum duration, raced with the real sign-out through `Promise.all`. It doesn't wait in place of the sign-out. |
| T11 | `core/db/legacy-cleanup.ts` | Stop waiting on a blocked legacy `deleteDB` after 1 s | **keep** | Storage timeout. Pending item #40 (storage) stays out of scope. |
| T12 | `core/testing/cross-tab.ts` `settleChannel` | Specs wait one macrotask for the fake channel's delivery and the refresh it triggers | **convert** | It guesses that one macrotask covers the delivery and the IndexedDB re-read. **Replacement**: `delivered()` awaits the fake's own delivery hop (a microtask, by its contract), and `nextRefresh(service)` resolves when the receiving service's `refresh()` settles (R5). |

### Repeating timers (3)

| # | Location | Purpose | Verdict | Reason |
|---|----------|---------|---------|--------|
| I1 | `core/services/sync-status.service.ts` constructor | Ticks `now` for "há N min" | **keep** | Periodic clock. Cleared on destroy. |
| I2 | `shared/auth/cloud-steps.ts` `startCooldown` | Counts down the resend cooldown each second | **keep** | Cooldown. Cleared by `stopCooldown()` and `reset()`. |
| I3 | `shared/ds/identity-wheel/identity-wheel.ts` constructor | Emits motes every `MOTE_EVERY_MS` | **keep** | Periodic emission. Cleared on destroy. |

### Effects (15)

| # | Location | Purpose | Verdict | Reason / replacement |
|---|----------|---------|---------|----------------------|
| E1 | `views/deck-area/deck-area.ts` constructor | Redirect a missing deck to `/decks` | **keep** | Navigates, which is outside the reactive state. |
| E2 | `views/collection-area/collection-area.ts` constructor | Redirect a missing collection or empty holding box | **keep** | Navigates. |
| E3 | `shared/effects/page-sweep/page-sweep.ts` `attach` | Copies the canvas and host into `SweepLoop` fields | **convert** | Copied state. **Replacement**: `SweepLoop` injects the host's `ElementRef`, and `start()` takes a `dust` getter read at its first frame, like `layer` (R2). |
| E4 | `shared/effects/page-sweep/page-sweep.ts` run watcher | Starts the loop on a new run, settles it on none | **keep** | Starts and stops a rAF loop and writes `<main>`'s scroll. |
| E5 | `shared/effects/page-sweep/page-sweep.ts` focus | Focuses the new page's `h1` after each change | **keep** | Focus. |
| E6 | `shared/effects/page-sweep/page-change.ts` `injectPageChange` | Calls `change.go(target())` | **convert** | Its only job is to store `shown`/`leaving`/`run` derived from the target. **Replacement**: one `linkedSignal` over `target`, written locally by `end(run)` (R3). |
| E7 | `views/planechase/planechase.ts` constructor | Preloads the next card's image | **keep** | Fills Cache Storage. |
| E8 | `shared/layout/nav-drawer/nav-drawer.ts` constructor | `showModal()`/`close()` from `drawerOpen` | **keep** | DOM and focus. |
| E9 | `shared/ds/toast/toast-outlet.ts` constructor | Registers and unregisters the outlet as a toast host | **keep** | Push order across outlets is the shared registry's state, so it can't be derived per outlet. It's a registration with a lifecycle, released on destroy. |
| E10 | `shared/gameplay/planar-image/planar-image.ts` constructor | Loads the image through the on-device cache once visible | **keep** | I/O that may write Cache Storage. `resource()` was considered and not used: the load is a side effect, and this audit doesn't add a new primitive. |
| E11 | `shared/ds/fluid-height.ts` constructor | Crossing 640 px re-measures | **keep** | Writes the face's height and classes to the DOM. |
| E12 | `shared/ds/identity-wheel/identity-wheel.ts` constructor | Appends a burst per newly lit color | **convert** | It stores a value computed from `lit()`. **Replacement**: `bursts` becomes a `linkedSignal` over `lit`, still written locally when a burst's animation ends (R4). |
| E13 | `shared/auth/profile-modal/profile-modal.ts` constructor | A new request runs `store.open(start)` | **keep** | `open()` resets through `cloud.reset()`, which stops the cooldown interval and discards pending cloud auth (`cloudAuth.discardPending()`). |
| E14 | `shared/auth/entry-modal/entry-modal.ts` constructor | A new request runs `store.start(request)` | **keep** | Same as E13 (`reset()` → `cloud.reset()`). |
| E15 | `views/planechase-deck/planar-preview.controller.ts` constructor | The restart confirm or a collapsed set closes the preview | **keep** | `close()` removes document and window listeners and may call `history.back()`. |

### After-render effects (5)

| # | Location | Purpose | Verdict | Reason |
|---|----------|---------|---------|--------|
| A1 | `shared/ds/fluid-height.ts` constructor | Re-observes the elements and attaches the face listeners | **keep** | ResizeObserver and listeners, released on destroy. |
| A2 | `shared/ds/focus.ts` `focusOnChange` | Focuses the first stop on a new screen | **keep** | Focus. |
| A3 | `shared/ds/toast/toast-outlet.ts` constructor | `showPopover()`/`hidePopover()` | **keep** | Top layer (DOM). |
| A4 | `shared/gameplay/planar-controls.ts` constructor | Focuses Cancelar when the confirm opens | **keep** | Focus. |
| A5 | `views/planechase-deck/planechase-deck.ts` constructor | Places the popover beside its tile and follows scroll/resize | **keep** | DOM placement and listeners, released through `onCleanup`. |

### Router-event subscriptions (3)

| # | Location | Purpose | Verdict | Reason / replacement |
|---|----------|---------|---------|----------------------|
| R1 | `app.ts` constructor | `NavigationEnd` to a new path scrolls `<main>` to the top | **keep** | Reacts to each completed navigation, comparing it with the previous path. |
| R2 | `core/services/shell-state.service.ts` constructor | `NavigationStart` closes the drawer | **keep** | A command on each navigation start. `Router.currentNavigation` also changes at the end, so as a source it would close a drawer opened mid-navigation. |
| R3 | `shared/effects/page-sweep/page-change.ts` `injectPageChange` | Records the latest `NavigationStart`'s trigger and `info` | **convert** | Its consumer reads only the latest value, when the target changes. **Replacement**: read `router.currentNavigation() ?? router.lastSuccessfulNavigation()` untracked inside the page-change computation (R3). |

## R1. The sweep's end comes from its own frame loop (T3)

- **Decision**: `SweepLoop.step()` calls `onCrossed` once, on the first frame where `elapsed >= SWEEP_MS` and the run isn't settling. This is the frame where `turning` turns false and `settleAt` is set. `settle()` then only marks the run settling, or stops a run that hasn't drawn yet. No timer is left.
- **Rationale**: The front is drawn by the rAF loop, not by CSS, so its end is a frame of that loop. The timer was set on the same first frame for the same duration, so it guessed a moment the loop already knows. Changing `SWEEP_MS` or the frame timing now moves the end with the drawn front (SC-005).
- **Never runs**: under reduced motion, `PageChange` swaps instantly and no sweep starts. A tab hidden mid-sweep pauses rAF, and the sweep ends on the first frame after the tab returns. Nobody can use a hidden tab, so the input left blocked meanwhile isn't visible. A superseded sweep is stopped by `stop()`, which cancels the frame, so `onCrossed` can't run twice.
- **Specs**: `page-sweep.spec.ts` already fakes `requestAnimationFrame`. Advancing fake time runs the drawn frames, which drives the animation itself rather than a guessed timer. `setTimeout`/`clearTimeout` drop out of `toFake`. The area specs keep waiting real frames.
- **Alternatives**: A CSS animation on `--front` with `animationend` was rejected because the dust and the front have to share one clock. Keeping the timer as a fallback was rejected: rAF always runs in a visible document, so there is no missing event to fall back from.

## R2. `SweepLoop` reads its host and canvas itself (T2, E3)

- **Decision**: `SweepLoop` (provided by `PageSweep`) injects `ElementRef` for the host. `attach()` is removed, and `start(dir, { layer, dust }, onCrossed)` takes `dust: () => HTMLCanvasElement | null` and reads it on the first frame, as it already reads `layer`. `stop()` clears the canvas of the run it stops (`run.dust`), not a stored field.
- **Rationale**: The effect only copied two values into fields. The host is fixed for the loop's lifetime, and the canvas is wanted only when a sweep starts. With the host always present, the no-host timer branch (T2) is unreachable.
- **Alternatives**: Keeping `attach` with a getter called once from the constructor was rejected as the same indirection under another name.

## R3. The page change is a `linkedSignal` over its target (E6, R3)

- **Decision**: `PageChange` holds one `linkedSignal<P | null, PageState<P>>`. Its source is `target` and its value is `{ started, shown, leaving, run }`. The computation is the current `go()` logic, given the previous state: a `null` target keeps the previous value, the first non-null target shows instantly, a change during a sweep finishes it first, and the same place keeps the value. Reduced motion, `NO_SWEEP_INFO` or the rule's `null` swap instantly, and anything else returns a new `run`. `end(run)` writes `{ leaving: null, run: null }` only when `run` is still current. `shown`, `leaving` and `run` are `computed` views. `go()` is removed.
- **Reading the navigation**: The computation reads `reducedMotion()` and `nav()` inside `untracked`, because a `linkedSignal` computation tracks its reads. `nav` reads `router.currentNavigation() ?? router.lastSuccessfulNavigation()` (both are signals in `@angular/router` 22.1) and maps it to `{ trigger: nav.trigger, info: nav.extras.info }`. During activation the current navigation is the one that set the target. After it lands, the last successful navigation is that same one. That gives the same value the `NavigationStart` subscription recorded, so the subscription and its `DestroyRef` cleanup go.
- **Rationale**: The value is derived as soon as it's read after the target changes, with no effect tick in between (US2 independent test). Edits stay possible through `end()`, which is the writable-derived case in FR-008.
- **Constructor**: `new PageChange(rule, reducedMotion, target, nav)`. Specs build it with a writable `target` signal and set that instead of calling `go()`. `page-change.spec.ts` and `page-sweep.spec.ts` change only where they called `go()` (FR-013).
- **Alternatives**: `computed` alone can't take `end()`. Keeping the effect and moving only the navigation read was rejected, because the effect is the copied state FR-008 removes.

## R4. Identity-wheel bursts are a `linkedSignal` over `lit` (E12)

- **Decision**: `bursts = linkedSignal<Color[], Burst[]>({ source: this.lit, computation: (lit, prev) => ... })`. With no previous value the list is empty, as on first render today. Otherwise the result is `prev.value` plus `makeBurst` for each color in `lit` that isn't in `prev.source`. `reducedMotion` is read untracked, as today. Removing a burst when its animation ends stays a local `bursts.update(...)`.
- **Rationale**: The effect only computed new list items from `lit()` and stored them. Lit colors and the bursts' lifetimes both live in the one writable derived value.

## R5. Cross-tab specs wait for delivery and refresh, not a macrotask (T12)

- **Decision**: In `@testing/cross-tab`, `settleChannel()` becomes `delivered()`, which resolves after one microtask. The fake channel delivers in exactly one `queueMicrotask` hop by its own contract, so this awaits the delivery itself. `otherCopy().announce()` returns `delivered()`. A new `nextRefresh(service: { refresh(): Promise<void> })` spies on the service instance's `refresh` and resolves when the next call's promise settles. Specs that check a refresh call it before `announce`, then await it. CrossTabService's handlers call `this.refresh()` at delivery time, so an instance spy sees the call.
- **Rationale**: `setTimeout(0)` worked only because one macrotask happened to cover the fake IndexedDB re-read. Waiting on `refresh()` waits for the state change itself (FR-007, FR-012). Production code is unchanged.
- **Alternatives**: `vi.waitFor` polling was rejected because it's still a timer loop. Making `CrossTabService` return its handlers' promises was rejected because it changes production code only for tests.

## R6. The fluid-height fallback stays a fallback (T7)

- **Decision**: Keep the timer as recorded. It is already paired with `transitionend` on the face's `height`.
- **Rationale**: A height capped by `max-height` produces no transition and no cancel event, so only a timer can end that wait. Clearing on `transitioncancel` would drop `is-resizing` in the middle of a chained resize and flash the scrollbar. Its duration is tied to `--duration-base` by the existing comment.

## R7. Collection-area navigation promises (lint, 2 × no-floating-promises)

- **Decision**: `openCollection` and `openHolding` mark the promise with `void this.router.navigate(...)`.
- **Rationale**: If the navigation fails or is cancelled, the right outcome is that the person stays on the current page. Nothing needs to recover or retry, and the Router reports navigation errors through its own error handling. This matches the existing `void this.router.navigate` redirects (E1, E2). It's a decision about the failure case, not a blanket ignore (FR-014).

## R8. Spec mocks with a real return type (lint, 4 × no-misused-promises)

- **Decision**: In `sync.service.spec.ts` (lines 439, 659, 805), `from` is declared as `Mock<(table: string) => unknown>` instead of `ReturnType<typeof vi.fn>`, so returning the thenable query object matches the declared signature. In `profile-flow.store.spec.ts` (line 424), `cloudAuth` is typed so `deleteAccount` has the `CloudAuthService['deleteAccount']` signature, which returns `Promise<void>`. That makes the `async` implementation the declared contract.
- **Rationale**: These aren't floating promises. The mocks are under-typed as void-returning, and the real APIs return promises (or thenables). Correct types fix the cause, and the tests check the same behavior (FR-014, US3-2).
- **Then**: `npx eslint src --prune-suppressions` empties `eslint-suppressions.json`, the file is deleted, and `npm run lint` passes without it (FR-015). ESLint only reads the file when it exists, so `eslint.config.js` needs no change. This is checked during implementation.

## R9. Docs (FR-016)

- **architecture.md**, "Lint and budgets": drop the `eslint-suppressions.json` sentences and keep the rule list.
- **architecture.md**: a new bullet states the general rule:
  > **Timers, effects and router events**: a timer is kept only when its duration is the behavior (a visible duration, hover or press delay, network or storage timeout, periodic clock, cooldown or emission), or as the recorded fallback for an event that may never fire, paired with that event. Anything that waits for an animation or another part of the app waits for its end event or its state. `effect`/`afterRenderEffect` only change something outside the reactive state (DOM, focus, storage, the browser, a timer or listener they own), and a value derived from other state is `computed` or `linkedSignal`. A router-event subscription is kept only when each event in order matters; a consumer of the latest navigation reads `Router.currentNavigation()`/`lastSuccessfulNavigation()`. Every one is released on destroy.
- **commands.md**: drop the `--prune-suppressions`/`--suppress-rule` paragraph. Without a suppressions file, a new rule must land with its violations fixed.

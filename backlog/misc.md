# Healthcheck backlog

Deferred from the `/simplify` pass on spec 009's page sweep (2026-09-28), for the healthcheck spec. Each was too large for a cleanup pass or would change behavior. Check each still applies before planning.

## 1. One page-change controller

`DeckTurn` (`views/deck-area/deck-turn.ts`) and `CollectionTransition` (`views/collection-area/collection-transition.ts`) are near-identical state machines: `shown`, `turning`, `reducedMotion`, `initialized`, finish-then-start, the same `sweep.start` call. Extract a shared controller (e.g. `PageChange<P>`); each area supplies only its direction rule (`turnFor` vs `transitionDir`).

## 2. `DeckTurn`: `pendingClose` → `leaving` model

Decks keep the deck page under during a close via `pendingClose`; collections use `shown = to` plus `leaving = from`. Blocker: `shownDeck` (linkedSignal in `deck-area.ts`) follows `turn.shown()`, so the outgoing deck page would go blank. It needs to derive from the leaving place too.

## 3. `PageSweep` as a component or directive

E.g. `<app-page-sweep [dir]>` with content projection, owning the canvas, the `.sweep` wrapper (a `viewChild` instead of `querySelector('.sweep')` and the `--front` reset workaround), the host `inert`, and the canvas `attach` effect each view still copies.

## 4. Drop `PageSweep.start`'s `active` callback

Both callers pass `() => turning() !== null`. Removing it changes behavior: when a change is finished without a new sweep (`DeckTurn`'s same-place early return), the dust currently settles at once instead of being pushed until `SWEEP_MS`. Decide the intended behavior first.

## 5. Collections: `redirecting` flag → navigation `info`

Replace the mutable flag in `collection-area.ts` with `info: { instant: true }` on the redirect, read from `NavigationStart` extras the way `DeckTurn` uses `lastNav`.

## 6. `CompactModal` height tracking vs `FluidFace`

`compact-modal.ts` has its own `ResizeObserver` / `measure()` / `is-resizing`; `themed-modal/fluid-face.ts` does similar work (plus `document.fonts.ready`, window resize, the viewport cap). Unify into one helper, keeping the compact modal's direct style write (a binding lands a frame late and flashes the scrollbar) and its arm-on-first-interaction. The explicit first `measure()` next to `observer.observe()` also measures twice on open.

## 7. DESIGN.md: compact modal fluid height (undecided)

Flagged by `design-auditor`: the compact modal's desktop fluid height (the face animates to its content's height over `--duration-base`, only after the first pointer or key press, never under reduced motion) isn't in DESIGN.md's "Compact modal" entry. DESIGN.md's "Fluid height" covers only the 880px auth/profile modal. Add it.

## 8. Memoize `pageOf`

`pageOf(id)` in `collection-area.ts` is a plain template method, run per change-detection pass for both the shown and the leaving place (path walk, depth, kind, a fresh object). Could be one `computed` per place. Low cost today (≤ 3 levels).

## 9. `--band` duplication

`FRONT_BAND` (`deck-dust.util.ts`) and `--band: 160px` (`styles/_page-sweep.scss`) are kept in sync by a comment only. `PageSweep` could set `--band` inline from the constant.

## 10. Naming leftovers

`deck-dust.util.ts` is no longer deck-specific (the shared page sweep uses it); move or rename it next to `page-sweep`. `app.routes.ts` still says "page turn".

## 11. Default-identity fallback repeated

`activeColors() ?? DEFAULT_IDENTITY` appears in `page-sweep.ts`, `theme.service.ts` (`colors`) and `identity.service.ts` (`roles`). One `effectiveColors` computed on `IdentityService` would cover all three.

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

## 13. Sync card artist data

Scryfall provides artist info, but `scripts/sync-scryfall.ts` doesn't extract it. The `ScryfallCard` interface has the artist field available, but `toCardRow` and `toPrintingRow` skip it. Add `artist` to the sync (likely to `printings` table since it's printing-specific in Scryfall) and ensure the Supabase schema has the column.

## 14. Remove all old unused code

Delete legacy code nothing references anymore. Candidates to verify first (none confirmed yet): the `ThemeService` adapter over `IdentityService`, the legacy mixin partials in `src/styles/` (`_modal.scss`, `_dropdown.scss`), legacy component `.scss`, dead exports and imports. Confirm each is unused with grep/lint before removing it.

## 15. Add proper mobile-landscape layout

A phone in landscape is short (~390px tall) but often wider than `$bp-mobile` (640px), so it gets the tablet/desktop layout on a very short screen. The breakpoints only look at width. Add a height-aware condition (e.g. `(orientation: landscape) and (max-height: …)`), then check the app shell, top bar, modals (the fluid-height faces and their viewport cap) and the Planechase phone dock against it.

## 16. Split the auth flow stores

`profile-flow.store.ts` (~720 lines) and `entry-flow.store.ts` (~580) are the largest files in the app. The cloud-form steps they share through `CloudFlowHost` (sign-in, reauth, reset code) likely repeat logic in both. Extract a shared cloud sub-store and leave each store with only its own screens.

## 17. Split `SyncService`

`sync.service.ts` (~620 lines) runs the identity step, collections, decks, cards, planar selection and the repair passes (`repairCollectionTree`, `repairDeckNames`, `resolveMixedCollections`) in one class. Make each entity a small sync step behind a thin orchestrator, the way `reconcileEntities` is already generic.

## 18. One shared write queue

`enqueueWrite` and its `console.error('Grimorio: failed to persist …')` catch are copied in `CardService`, `CollectionService`, `DeckService`, `PlanarSelectionService` and `PlanechaseGameService`. Extract a `WriteQueue` helper. It is also the one place to surface persist failures (e.g. via `ToastService`) instead of failing silently.

## 19. Focus-management helper

Focus moves by hand through `querySelector(...).focus()` in `collection-delete-dialog.ts` (roving choice), `nav-drawer.ts` (return focus to the toggle), `compact-modal.ts` (`[data-autofocus]`) and `fluid-face.ts` (first field). One roving-focus/autofocus helper or directive could cover them.

## 20. Retire `ThemeService`

Only `card-color.util.ts` and `add-card-modal.ts` still use the legacy adapter. Move them to `IdentityService` and delete it (with its spec). Narrows #14 and removes one of #11's three call sites.

## 21. Retire `_modal.scss` / `_dropdown.scss`

Only four stylesheets still `@use` them: `add-card-modal.scss` and `card-add-detail-panel.scss` (`modal`), `select.scss` and `filter-select.scss` (`dropdown`). Move those to DESIGN.md primitives, then delete the partials. Narrows #14.

## 22. Specs for untested logic

Pure logic with no spec: `card-import.util.ts`, `dropdown-placement.util.ts`, `dropdown-dismiss.util.ts`, `card-color.util.ts`, `db/entity-store.ts` (the all-or-nothing `writeRows` transaction), `profile-session.service.ts` and `identity.service.ts`. Cheap to test and the most likely to break silently.

## 23. `setTimeout` audit

19 `setTimeout` calls outside specs. Check which should instead be tied to `animationend`/`transitionend` or signals; timer-based sequencing is a flakiness source (see the SC-004 fix).

## 24. Bundle budgets

`angular.json` sets no `budgets`. Add initial and per-lazy-chunk limits so a static `tesseract.js` import or the Planechase data leaking into the main bundle fails the build.

## 25. Stricter lint rules

Consider `@typescript-eslint/no-floating-promises` (many `whenReady()`/`flush()` calls), angular-eslint's `prefer-signals`, and a `no-restricted-imports` rule forbidding relative `../` imports into `core`/`shared` so the path-alias convention is enforced.

## 26. Stale nav doc

`.claude/docs/architecture.md` still describes `src/app/shared/layout/nav-bar/`, which no longer exists (now `nav-drawer`, `side-nav`, `nav-links`), including its `--nav-bar-height` note. Update it to the current layout components.

## 27. Request persistent storage

Call `navigator.storage.persist()` (e.g. after the first profile is created) so the browser or Android WebView is less likely to evict the IndexedDB data under storage pressure.

## 28. `effect` audit

22 `effect(` calls outside specs. Check which are really derived state and should be `computed` or `linkedSignal` (the idiom in architecture.md), keeping `effect` for real side effects.

## 29. Multi-tab IndexedDB handling

With the installed PWA and a browser tab open on the same profile, each tab holds its own in-memory collections/decks and never sees the other's edits. `openProfileDb` (`core/db/profile-db.ts`) also passes no `blocked`/`blocking` callbacks, so an old tab never closes its connection on `versionchange` and a new tab's `DB_VERSION` upgrade stalls. Close on `blocking` (and reload or rehydrate), and decide whether tabs should resync via `BroadcastChannel`.

## 30. Sync paging for collections and decks

`syncCollections`/`syncDecks` (`sync.service.ts`) pull each table with one unpaged `select`. The hosted Data API caps a response at 1,000 rows by default, so past that the rest are silently missing and look local-only to the reconciler. Unlikely at today's sizes; page with `.range()` (or pull only `updated_at > lastSyncedAt`, which also cuts egress) when sync is next touched.

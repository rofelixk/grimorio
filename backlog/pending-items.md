# Pending items

Known work that isn't specced yet. [features.md](features.md) groups items into planned specs by number (`#N`), so **numbers are permanent**: never renumber, and give a new item the next free number (the next is **#37**; #12 was retired). When a spec ships, delete its items here. Check each item still applies before planning it.

**Size**: `S` a focused change, `M` several files or one design decision, `L` changes a model or spans the app. Every **L** is listed under "Big items" too.

## Big items

- **#31 Planechase: cards that need the planar deck** — five cards still can't be played as written; two of them need several face-up planes.
- **#29 Multi-tab IndexedDB handling** — a second tab can stall the database upgrade and never sees the other tab's edits.
- **#17 Split `SyncService`** — ~620 lines, one class for every entity.
- **#16 Split the auth flow stores** — the two largest files in the app.
- **#15 Mobile-landscape layout** — the breakpoints only look at width.

## At a glance

| # | Item | Size | Spec ([features.md](features.md)) |
|---|---|---|---|
| **Planechase gameplay** | | | |
| 31 | Cards that need the planar deck | **L** | — |
| 32 | Phenomena that change the die | M | — |
| 33 | "Then planeswalk" chaos abilities | S | — |
| 34 | Effects that last until a planeswalk | S | — |
| 35 | Default-off the unsupported cards | S | — |
| 36 | DESIGN.md: Interplanar Tunnel chooser | S | — |
| **Page transitions** | | | |
| 1 | One page-change controller | M | 4 |
| 2 | `DeckTurn`: `pendingClose` → `leaving` | M | 4 |
| 3 | `PageSweep` as a component or directive | M | 4 |
| 4 | Drop `PageSweep.start`'s `active` callback | S | 4 |
| 5 | Collections: `redirecting` → navigation `info` | S | 4 |
| 8 | Memoize `pageOf` | S | 4 |
| 9 | `--band` duplication | S | 4 |
| 10 | Naming leftovers | S | 4 |
| **Modals, focus & auth** | | | |
| 6 | `CompactModal` height tracking vs `FluidFace` | M | 3 |
| 7 | DESIGN.md: compact modal fluid height | S | 3 |
| 16 | Split the auth flow stores | **L** | 3 |
| 19 | Focus-management helper | M | 3 |
| **Storage & sync** | | | |
| 17 | Split `SyncService` | **L** | 2 |
| 18 | One shared write queue | M | 2 |
| 27 | Request persistent storage | S | 2 |
| 29 | Multi-tab IndexedDB handling | **L** | 2 |
| 30 | Sync paging for collections and decks | S | 2 |
| **Codebase health** | | | |
| 11 | Default-identity fallback repeated | S | 1 |
| 14 | Remove all old unused code | M | 1 |
| 22 | Specs for untested logic | M | 1 (card files deferred) |
| 23 | `setTimeout` audit | M | 5 |
| 24 | Bundle budgets | S | 1 |
| 25 | Stricter lint rules | M | 1 |
| 26 | Stale nav doc | S | 1 |
| 28 | `effect` audit | M | 5 |
| **Layout** | | | |
| 15 | Mobile-landscape layout | **L** | 6 |
| **Card redesign (deferred)** | | | |
| 13 | Sync card artist data | M | deferred |
| 20 | Retire `ThemeService` | S | deferred |
| 21 | Retire `_modal.scss` / `_dropdown.scss` | M | deferred |

---

## Planechase gameplay

Found in a scan of all 151 catalog cards (2026-09-29) for effects that touch what the app tracks: the planar deck, the die, the roll cost and planeswalking. Spec 006 leaves card effects to the table, but the table can't see the planar deck, so these cards are wrong or unplayable as written. Interplanar Tunnel was the first one fixed (`tunnelReveal`/`resolveTunnel` in `planechase-game.util.ts`, `app-tunnel-choice`); the rest follow the same shape: a pure transition, derived (never stored) reveals, undoable.

### #31 · Cards that need the planar deck — L

Only the app knows the deck's order, so the table can't resolve these:

- **Stairs to Infinity** (plane) — on chaos, reveal the top card of the planar deck; the table may put it on the bottom. The simplest: one revealed card, a keep/bottom choice.
- **The Fertile Lands of Saulvinia** (plane) — on chaos, reveal down to the next plane; *that* plane's chaos ability triggers; everything revealed goes to the bottom. The app must show another card's chaos text.
- **Pools of Becoming** (plane) — on chaos, reveal the top three cards; all three chaos abilities trigger, then they go to the bottom. Three foreign chaos texts at once.
- **Norn's Seedcore** (plane) — arriving there makes chaos ensue; on chaos, reveal down to the next plane and planeswalk to it *without leaving any plane*. Several face-up planes.
- **Spatial Merging** (phenomenon) — reveal down to two planes and planeswalk to both at once. Several face-up planes.

The last two need `PlanechaseGameState.current` to become a set of face-up planes (a planeswalk leaves all of them; chaos asks which one's ability applies). Spec 006 put "Grand Melee (several face-up planes)" out of scope, so they share that decision.

### #32 · Phenomena that change the die — M

The app's roll result is wrong while these apply:

- **Chaotic Aether** — every blank roll is a chaos roll until a player planeswalks away from a plane. The app shows "Nada acontece". The game state can hold the flag and clear it on the next planeswalk.
- **Fixed Point in Time** — until your next turn, a planeswalk roll makes chaos ensue instead. The app doesn't know whose turn it is, so this needs a manual on/off control.

### #33 · "Then planeswalk" chaos abilities — S

**Bad Wolf Bay**, **Pompeii**, **TARDIS Bay**, **Temple of Atropos** and **Grand Ossuary** end their chaos ability with "Then planeswalk". It works today through the manual Planeswalk button (cost unchanged, which is correct), but nothing reminds the table. A hint or a prompted planeswalk after their chaos result would cover it. **Aretopolis** and **Lair of the Ashen Idol** planeswalk on their own from table state the app can't see, so the manual button stays the answer there.

### #34 · Effects that last until a planeswalk — S

**Agyrem**, **Celestine Reef**, **Eloren Wilds**, **Unyaro** and **The Doctor's Childhood Barn** create effects that end "until a player planeswalks". The app knows exactly when that happens and could remind the table as it does.

### #35 · Default-off the unsupported cards — S

`default-off.ts` holds Temple of Atropos, Otaria and Morphic Tide, but none of the cards in #31 or #32, so they're live in a default deck. Until each is supported, consider adding them (and removing each as it ships).

### #36 · DESIGN.md: Interplanar Tunnel chooser — S

`app-tunnel-choice` isn't in DESIGN.md, so by its own rule the design is undecided. `design-auditor` listed what an entry needs: placement (under the card block, above the links); the eyebrow `h2` "N planos revelados"; a `radiogroup` with roving tabindex (arrows, Home, End); "Concluir encontro" disabled until a pick, and the pick reset whenever the reveal changes; a 5-column grid (1 on phone) vs. the card tile's 4; the chosen state (lit bead + role-primary border, glow on hover only); the focus outline on the image frame; the heading level next to the card name's `h2`. The bead-inset `calc()` is duplicated from `planar-tile.scss` — move it into `_bead.scss` when both are documented. The future #31/#32 choosers should follow the same entry.

---

## Page transitions

### #1 · One page-change controller — M

`DeckTurn` (`views/deck-area/deck-turn.ts`) and `CollectionTransition` (`views/collection-area/collection-transition.ts`) are near-identical state machines: `shown`, `turning`, `reducedMotion`, `initialized`, finish-then-start, the same `sweep.start` call. Extract a shared controller (e.g. `PageChange<P>`); each area supplies only its direction rule (`turnFor` vs `transitionDir`).

### #2 · `DeckTurn`: `pendingClose` → `leaving` model — M

Decks keep the deck page under during a close via `pendingClose`; collections use `shown = to` plus `leaving = from`. Blocker: `shownDeck` (linkedSignal in `deck-area.ts`) follows `turn.shown()`, so the outgoing deck page would go blank. It needs to derive from the leaving place too.

### #3 · `PageSweep` as a component or directive — M

E.g. `<app-page-sweep [dir]>` with content projection, owning the canvas, the `.sweep` wrapper (a `viewChild` instead of `querySelector('.sweep')` and the `--front` reset workaround), the host `inert`, and the canvas `attach` effect each view still copies.

### #4 · Drop `PageSweep.start`'s `active` callback — S

Both callers pass `() => turning() !== null`. Removing it changes behavior: when a change is finished without a new sweep (`DeckTurn`'s same-place early return), the dust currently settles at once instead of being pushed until `SWEEP_MS`. Decide the intended behavior first.

### #5 · Collections: `redirecting` flag → navigation `info` — S

Replace the mutable flag in `collection-area.ts` with `info: { instant: true }` on the redirect, read from `NavigationStart` extras the way `DeckTurn` uses `lastNav`.

### #8 · Memoize `pageOf` — S

`pageOf(id)` in `collection-area.ts` is a plain template method, run per change-detection pass for both the shown and the leaving place (path walk, depth, kind, a fresh object). Could be one `computed` per place. Low cost today (≤ 3 levels).

### #9 · `--band` duplication — S

`FRONT_BAND` (`deck-dust.util.ts`) and `--band: 160px` (`styles/_page-sweep.scss`) are kept in sync by a comment only. `PageSweep` could set `--band` inline from the constant.

### #10 · Naming leftovers — S

`deck-dust.util.ts` is no longer deck-specific (the shared page sweep uses it); move or rename it next to `page-sweep`. `app.routes.ts` still says "page turn".

---

## Modals, focus & auth

### #6 · `CompactModal` height tracking vs `FluidFace` — M

`compact-modal.ts` has its own `ResizeObserver` / `measure()` / `is-resizing`; `themed-modal/fluid-face.ts` does similar work (plus `document.fonts.ready`, window resize, the viewport cap). Unify into one helper, keeping the compact modal's direct style write (a binding lands a frame late and flashes the scrollbar) and its arm-on-first-interaction. The explicit first `measure()` next to `observer.observe()` also measures twice on open.

### #7 · DESIGN.md: compact modal fluid height (undecided) — S

Flagged by `design-auditor`: the compact modal's desktop fluid height (the face animates to its content's height over `--duration-base`, only after the first pointer or key press, never under reduced motion) isn't in DESIGN.md's "Compact modal" entry. DESIGN.md's "Fluid height" covers only the 880px auth/profile modal. Add it.

### #16 · Split the auth flow stores — L

`profile-flow.store.ts` (~720 lines) and `entry-flow.store.ts` (~580) are the largest files in the app. The cloud-form steps they share through `CloudFlowHost` (sign-in, reauth, reset code) likely repeat logic in both. Extract a shared cloud sub-store and leave each store with only its own screens.

### #19 · Focus-management helper — M

Focus moves by hand through `querySelector(...).focus()` in `collection-delete-dialog.ts` (roving choice), `nav-drawer.ts` (return focus to the toggle), `compact-modal.ts` (`[data-autofocus]`) and `fluid-face.ts` (first field). One roving-focus/autofocus helper or directive could cover them.

---

## Storage & sync

### #17 · Split `SyncService` — L

`sync.service.ts` (~620 lines) runs the identity step, collections, decks, cards, planar selection and the repair passes (`repairCollectionTree`, `repairDeckNames`, `resolveMixedCollections`) in one class. Make each entity a small sync step behind a thin orchestrator, the way `reconcileEntities` is already generic.

### #18 · One shared write queue — M

`enqueueWrite` and its `console.error('Grimorio: failed to persist …')` catch are copied in `CardService`, `CollectionService`, `DeckService`, `PlanarSelectionService` and `PlanechaseGameService`. Extract a `WriteQueue` helper. It is also the one place to surface persist failures (e.g. via `ToastService`) instead of failing silently.

### #27 · Request persistent storage — S

Call `navigator.storage.persist()` (e.g. after the first profile is created) so the browser or Android WebView is less likely to evict the IndexedDB data under storage pressure.

### #29 · Multi-tab IndexedDB handling — L

With the installed PWA and a browser tab open on the same profile, each tab holds its own in-memory collections/decks and never sees the other's edits. `openProfileDb` (`core/db/profile-db.ts`) also passes no `blocked`/`blocking` callbacks, so an old tab never closes its connection on `versionchange` and a new tab's `DB_VERSION` upgrade stalls. Close on `blocking` (and reload or rehydrate), and decide whether tabs should resync via `BroadcastChannel`.

### #30 · Sync paging for collections and decks — S

`syncCollections`/`syncDecks` (`sync.service.ts`) pull each table with one unpaged `select`. The hosted Data API caps a response at 1,000 rows by default, so past that the rest are silently missing and look local-only to the reconciler. Unlikely at today's sizes; page with `.range()` (or pull only `updated_at > lastSyncedAt`, which also cuts egress) when sync is next touched.

---

## Codebase health

### #11 · Default-identity fallback repeated — S

`activeColors() ?? DEFAULT_IDENTITY` appears in `page-sweep.ts`, `theme.service.ts` (`colors`) and `identity.service.ts` (`roles`). One `effectiveColors` computed on `IdentityService` would cover all three.

### #14 · Remove all old unused code — M

Delete legacy code nothing references anymore. Candidates to verify first (none confirmed yet): the `ThemeService` adapter over `IdentityService`, the legacy mixin partials in `src/styles/` (`_modal.scss`, `_dropdown.scss`), legacy component `.scss`, dead exports and imports. Confirm each is unused with grep/lint before removing it.

### #22 · Specs for untested logic — M

Pure logic with no spec: `card-import.util.ts`, `dropdown-placement.util.ts`, `dropdown-dismiss.util.ts`, `card-color.util.ts`, `db/entity-store.ts` (the all-or-nothing `writeRows` transaction), `profile-session.service.ts` and `identity.service.ts`. Cheap to test and the most likely to break silently.

### #23 · `setTimeout` audit — M

19 `setTimeout` calls outside specs. Check which should instead be tied to `animationend`/`transitionend` or signals; timer-based sequencing is a flakiness source (see the SC-004 fix).

### #24 · Bundle budgets — S

`angular.json` sets no `budgets`. Add initial and per-lazy-chunk limits so a static `tesseract.js` import or the Planechase data leaking into the main bundle fails the build.

### #25 · Stricter lint rules — M

Consider `@typescript-eslint/no-floating-promises` (many `whenReady()`/`flush()` calls), angular-eslint's `prefer-signals`, and a `no-restricted-imports` rule forbidding relative `../` imports into `core`/`shared` so the path-alias convention is enforced.

### #26 · Stale nav doc — S

`.claude/docs/architecture.md` still describes `src/app/shared/layout/nav-bar/`, which no longer exists (now `nav-drawer`, `side-nav`, `nav-links`), including its `--nav-bar-height` note. Update it to the current layout components.

### #28 · `effect` audit — M

22 `effect(` calls outside specs. Check which are really derived state and should be `computed` or `linkedSignal` (the idiom in architecture.md), keeping `effect` for real side effects.

---

## Layout

### #15 · Mobile-landscape layout — L

A phone in landscape is short (~390px tall) but often wider than `$bp-mobile` (640px), so it gets the tablet/desktop layout on a very short screen. The breakpoints only look at width. Add a height-aware condition (e.g. `(orientation: landscape) and (max-height: …)`), then check the app shell, top bar, modals (the fluid-height faces and their viewport cap) and the Planechase phone dock against it.

---

## Card redesign (deferred)

These touch card code the redesign will replace, so they wait for it (see features.md, "Deferred: card redesign").

### #13 · Sync card artist data — M

Scryfall provides artist info, but `scripts/sync-scryfall.ts` doesn't extract it. The `ScryfallCard` interface has the artist field available, but `toCardRow` and `toPrintingRow` skip it. Add `artist` to the sync (likely to `printings` table since it's printing-specific in Scryfall) and ensure the Supabase schema has the column.

### #20 · Retire `ThemeService` — S

Only `card-color.util.ts` and `add-card-modal.ts` still use the legacy adapter. Move them to `IdentityService` and delete it (with its spec). Narrows #14 and removes one of #11's three call sites.

### #21 · Retire `_modal.scss` / `_dropdown.scss` — M

Only four stylesheets still `@use` them: `add-card-modal.scss` and `card-add-detail-panel.scss` (`modal`), `select.scss` and `filter-select.scss` (`dropdown`). Move those to DESIGN.md primitives, then delete the partials. Narrows #14.

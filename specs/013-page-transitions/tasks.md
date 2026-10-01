---

description: "Task list for 013 Page Transitions"
---

# Tasks: Page Transitions

**Input**: Design documents from `/specs/013-page-transitions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page-change.md, ui.md, quickstart.md

**Tests**: Requested. FR-018/FR-019 require the shared controller and the shared sweep to be covered (including interrupted changes), and quickstart.md lists the specs that must exist and pass.

**Organization**: Tasks are grouped by user story. This is a refactor: the shared units (Phase 2) block every story; US1 moves both areas onto them with no visible change; US2 proves no copy is left; US3 locks down interrupted changes (FR-009).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Conventions for every task

- Research ids (R1–R12) refer to [research.md](research.md); state machine and types to [data-model.md](data-model.md); public surface to [contracts/page-change.md](contracts/page-change.md); DOM to [ui.md](ui.md).
- Edit existing files with the Edit tool only (mixed CRLF/LF repo). Renames go through `git mv` so history follows the file.
- Tests and lint run through the `test-runner` agent. UI phases end with the `design-auditor` agent.
- No user-visible text changes (FR-020). DESIGN.md is not edited (FR-014).

- [ ] T000 Before any other task, check out `feature/013-page-transitions` and make its first commit: every file under `specs/013-page-transitions/` plus the design handoff folder (`design_handoff_*/`), and nothing else. (No `design_handoff_*/` folder exists for this feature, so the commit is the spec folder only.)

---

## Phase 1: Setup (Renames)

**Purpose**: Give the shared dust code a shared name (FR-017, R12) before anything new imports it.

- [ ] T001 `git mv src/app/core/utils/deck-dust.util.ts src/app/core/utils/sweep-dust.util.ts` and `git mv src/app/core/utils/deck-dust.util.spec.ts src/app/core/utils/sweep-dust.util.spec.ts`; update every import of `@utils/deck-dust.util` (today `src/app/shared/effects/page-sweep/page-sweep.ts` and the spec itself) to `@utils/sweep-dust.util`. Content unchanged except any doc comment that calls the dust deck-specific (FR-017).
- [ ] T002 Checkpoint: run the full suite and lint via `test-runner` (prune `eslint-suppressions.json` with `npx eslint src --prune-suppressions` if an entry pointed at the old path), fix everything, then commit Phase 1 ("Page transitions: setup").

---

## Phase 2: Foundational (Shared page-change units)

**Purpose**: The shared controller, rules and sweep component every story builds on. Nothing is wired into an area yet. The old `DeckTurn`/`CollectionTransition`, their utils, and the `PageSweep` service (moved to `page-sweep.service.ts` in T010) keep running the areas until Phase 3, so every checkpoint stays green.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Pure rules and types

- [ ] T003 Create `src/app/core/utils/page-change.util.ts` (R2, R4, contract): `type SweepDir = 'open' | 'close'`; `interface PageNav { trigger: 'imperative' | 'popstate' | 'hashchange'; info?: unknown }` (no `replaceUrl`, data-model "PageNav"); `interface PageRule<P> { initial: P; same(a: P, b: P): boolean; sweep(from: P, to: P, nav: PageNav | null): SweepDir | null }`; `SWEEP_INFO = { sweep: true }` and `NO_SWEEP_INFO = { sweep: false }` (as `const`, readonly); `sweepInfo(nav)` returning `info.sweep` when it is a boolean, otherwise `undefined`.
- [ ] T004 [P] Create `src/app/core/utils/deck-pages.util.ts` (+ `.spec.ts`) next to `deck-turn.util.ts`, which stays until T021, with `DeckPlace` (`{ kind: 'list' } | { kind: 'deck'; id: string }`) and `DECK_PAGES: PageRule<DeckPlace>` (data-model "PageRule"): `initial` = list; `same` = same kind and, for a deck, same id; `sweep`: list → deck is `'open'` only when `sweepInfo(nav) === true`, deck → list is `'close'`, anything else (deck → deck, unmarked list → deck) is `null`. It no longer reads `replaceUrl` or handles the first place (the controller does, R4). Port the trigger-table cases from the old spec to `src/app/core/utils/deck-pages.util.spec.ts`, dropping the cases that move to the controller (first place, `replaceUrl`/popstate).
- [ ] T005 [P] Create `src/app/core/utils/collection-pages.util.ts` (+ `.spec.ts`) next to `collection-transition.util.ts`, which stays until T021, with `CollectionPlace` (`{ kind: 'list' } | { kind: 'holding' } | { kind: 'collection'; id: string; depth: number }`, depth = tree depth 1–3 when routed; list depth 0, holding depth 1) and `COLLECTION_PAGES: PageRule<CollectionPlace>`: `initial` = list; `same` = same kind and, for a collection, same id, **depth ignored**; `sweep` = `'close'` when `to` is shallower than `from`, otherwise `'open'` (R2). No `depthOf` callback. Spec in `src/app/core/utils/collection-pages.util.spec.ts`: open deeper and sideways, close going up, depth carried on the place, `same` ignoring depth.

### Drawing engine

- [ ] T006 Create `src/app/shared/effects/page-sweep/sweep-loop.ts` (R5, R8, contract "SweepLoop") from the rAF/dust code of today's `PageSweep` service in `page-sweep.ts`: `@Injectable()` (not root) `SweepLoop` plus `export const SWEEP_MS = 500`. API: `attach(canvas: HTMLCanvasElement | null, host: HTMLElement)`, `start(dir: SweepDir, layer: () => HTMLElement | null, onCrossed: () => void)` (stops any previous run and clears its dust; `layer` read on the first frame; resets `--front` on the layer at start), `settle()` (idempotent, no-op without a run: the front stops and the dust starts the DESIGN.md settle at once, gone within `SETTLE_MAX_MS`), `stop()` (cancels timers/rAF, clears the canvas). The loop no longer takes or reads an `active()` callback (FR-010): it settles when `SWEEP_MS` has elapsed or `settle()` was called, whichever first. Timing, front, fade, dust physics and settle are otherwise byte-for-byte the current behavior (FR-014). `SweepDir` comes from `@utils/page-change.util`. Stops everything on `DestroyRef.onDestroy`.

### Controller

- [ ] T007 Create `src/app/shared/effects/page-sweep/page-change.ts` (R1, R6, R9, data-model "PageChange<P> state"): class `PageChange<P>` with readonly signals `shown: Signal<P>` (starts at `rule.initial`), `leaving: Signal<P | null>`, `run: Signal<SweepRun | null>` (`SweepRun = { dir: SweepDir }`, a new object per sweep, compared by identity), `reducedMotion: Signal<boolean>` (`mediaQuerySignal('(prefers-reduced-motion: reduce)')`); invariant `leaving !== null ⇔ run !== null`. `go(to)` evaluates in order: (1) first call → `shown = to`, nothing runs; (2) a run is set → finish it (`leaving = null`, `run = null`); (3) `same(shown, to)` → stop; (4) instant when `reducedMotion()`, or `sweepInfo(nav) === false`, or `rule.sweep(shown, to, nav) === null` → `shown = to`; (5) otherwise `leaving = shown`, `shown = to`, `run = { dir }`. `end(run)` clears `leaving`/`run` only if `run` is still current (stale end ignored). Export `injectPageChange<P>(options: PageRule<P> & { target: () => P | null })`: must run in an injection context; subscribes to `Router.events` and on each `NavigationStart` captures `PageNav` (`trigger` = `navigationTrigger`, `info` = `router.currentNavigation()?.extras.info`), unsubscribing with the caller's `DestroyRef`; registers an `effect` that calls `go(target())` (untracked inside `go`) whenever `target()` is non-null. Export `retained<K, T>(key: () => K | null, read: (key: K) => T | undefined): Signal<T | undefined>` as a `linkedSignal` that follows `read(key())`, keeps its previous value while the key is unchanged and `read` returns `undefined`, resets when the key changes, and is `undefined` for a `null` key.
- [ ] T008 Write `src/app/shared/effects/page-sweep/page-change.spec.ts` (quickstart table, FR-019) with a toy `PageRule` and a stubbed `matchMedia`, driving `go`/`end` directly and `injectPageChange` through `TestBed.runInInjectionContext` with a fake `Router` event stream: first place instant; a sweep sets `shown`/`leaving`/`run`; `end` clears it and ignores a stale run; instant via the rule, via `NO_SWEEP_INFO`, and under reduced motion; `same` returns early; `target` returning `null` does nothing; `NavigationStart` captures `trigger` and `info`; `retained` keeps the last value when `read` returns `undefined` and resets on a new key. (Interrupted-change cases are added in US3, T027.)

### Shared sweep component

- [ ] T009 [P] Create `src/app/shared/effects/page-sweep/page-place.ts`: standalone directive `PagePlace` on `ng-template[pagePlace]`, exposing its `TemplateRef` and a static `ngTemplateContextGuard` typing the context as `{ $implicit: unknown; leaving: boolean }`.
- [ ] T010 First `git mv src/app/shared/effects/page-sweep/page-sweep.ts src/app/shared/effects/page-sweep/page-sweep.service.ts`, content unchanged, and point its four importers (`deck-turn.ts`, `deck-area.ts`, `collection-transition.ts`, `collection-area.ts`) at `@shared/effects/page-sweep/page-sweep.service`. Then create the `PageSweep` component in a new `src/app/shared/effects/page-sweep/page-sweep.ts` (selector `app-page-sweep`, standalone, OnPush, `providers: [SweepLoop]`; R7, R10, R11, contract "`<app-page-sweep>`"). Inputs: `change = input.required<PageChange<unknown>>()`. Content: `place = contentChild.required(PagePlace)`. View: `.sweep` layer via `viewChild`, canvas via `viewChild`. Behavior: host `[attr.inert]` while `change().run()` is set (FR-012); an `effect` attaches the current canvas (or `null`) and the host to the loop (replaces each area's attach effect; handles the canvas appearing/disappearing with reduced motion); an `effect` on `run()`: on a new run, capture `<main>`'s `scrollTop` as the layer offset, reset `<main>` scroll to 0, and call `loop.start(dir, () => layer, () => change().end(run))`; on `null`, call `loop.settle()`; heading focus: after each change except the first place (an instant swap, or a run's end), `afterNextRender` focuses the incoming page's first `h1` (R11). Expose `band = FRONT_BAND` for the template.
- [ ] T011 Create `src/app/shared/effects/page-sweep/page-sweep.html` (ui.md §2): the `PagePlace` template stamped for `change().shown()` with `{ $implicit: shown, leaving: false }` as the first child, kept across changes (never re-created when a sweep starts); `@if (change().leaving(); as leaving)` → `div.sweep` with `[class.sweep--close]="change().run()?.dir === 'close'"`, `[style.top.px]="-offset()"`, `[style.--band.px]="band"`, containing the template stamped with `{ $implicit: leaving, leaving: true }`; `@if (!change().reducedMotion())` → `<canvas class="dust" aria-hidden="true">`.
- [ ] T012 Create `src/app/shared/effects/page-sweep/page-sweep.scss` by moving the `.sweep`, `.sweep--close`, `.dust` rules and the `@property --front` from `src/styles/_page-sweep.scss` (values unchanged, ui.md §5), dropping the `--band: 160px` declaration and its "matches" comment (R10, SC-003). `:host` is the positioned flex column the area hosts were: `position: relative; display: flex; flex-direction: column; flex: 1 0 auto` (copy the exact values from the current area `:host` rules). Do not delete the partial yet (T021).
- [ ] T013 Write `src/app/shared/effects/page-sweep/page-sweep.spec.ts` with a small test-host component that projects a `pagePlace` template rendering an `h1[tabindex=-1]` per place, using fake timers, a stubbed `getContext('2d')` and `matchMedia` (as in today's `src/app/views/deck-area/deck-turn.spec.ts`): the layer exists only while running; with `<main>` scrolled to 300, starting a run sets the `.sweep` layer's `top` to `-300px` and `<main>.scrollTop` to 0 (spec edge case "page was scrolled"); host `inert` only while running; `--band` equals `FRONT_BAND`px; the front moves right → left on open and back on close; `change.end(run)` is called a full `SWEEP_MS` after the first frame; `--front` reset on a quick second change; focus on the incoming `h1` after a change but not on the first place; no canvas under reduced motion; nothing running after destroy. (Interrupt/settle cases are added in US3, T028.)
- [ ] T014 Checkpoint: run the full suite and lint via `test-runner`, fix everything, then commit Phase 2 ("Page transitions: shared page change").

**Checkpoint**: The shared controller, rules and sweep component exist and are tested in isolation; both areas still run on the old code.

---

## Phase 3: User Story 1 - Page changes look and behave exactly as before (Priority: P1) 🎯 MVP

**Goal**: Both areas run on `injectPageChange` + `<app-page-sweep>`, with every DESIGN.md trigger unchanged (SC-001), decks on the `shown` + `leaving` model (FR-003, FR-004).

**Independent Test**: quickstart.md "Manual" steps 1–4 and 6 in both areas, with motion on and with reduced motion: each navigation sweeps or swaps instantly as before, in the same direction, the outgoing page whole until the front reaches it; then `deck-area.spec.ts`, `collection-area.spec.ts` and `deck-tile.spec.ts` pass.

### Implementation for User Story 1

- [ ] T015 [P] [US1] In `src/app/shared/decks/deck-tile/deck-tile.ts`, replace `turnInfo = { deckTurn: true }` with `SWEEP_INFO` from `@utils/page-change.util` (`[info]="sweepInfo"` or similar), and reword the header comment's "turns the page"/`info.deckTurn` to "page change"/`info.sweep` (R12). Update the `info` expectation in `src/app/shared/decks/deck-tile/deck-tile.spec.ts` to `{ sweep: true }`.
- [ ] T016 [US1] Migrate `src/app/views/deck-area/deck-area.ts`: remove `providers: [DeckTurn, PageSweep]`, the `inert`/`is-turning` host bindings, the `heading` view query and its focus effect, the canvas/`attach` effect, the `last` variable and the "drive from the address" effect. Add `protected readonly pages = injectPageChange<DeckPlace>({ ...DECK_PAGES, target: () => /* routed place, or null while the deck id is unknown */ })`. Replace the single retained `shownDeck` with `shownDeck = retained(() => deck id of pages.shown(), id => decks.byId()…)` and `leavingDeck` the same over `pages.leaving()` (R9). The missing-deck redirect keeps `replaceUrl: true` and adds `info: NO_SWEEP_INFO`; the delete landing's `info: { deckTurn: false }` becomes `info: NO_SWEEP_INFO` (R4). Update the class comment ("drives `DeckTurn`") to the new model.
- [ ] T017 [US1] Rewrite `src/app/views/deck-area/deck-area.html`: merge the `listPlace`/`deckPlace` templates and the three-branch `@if` into one `<app-page-sweep [change]="pages"><ng-template pagePlace let-place let-leaving="leaving">@switch (place.kind) { … }</ng-template></app-page-sweep>`; the deck branch reads `leaving ? leavingDeck() : shownDeck()` so the outgoing deck page (header, name, format, actions) stays whole during a close (FR-004). Keep `h1` `tabindex="-1"`, drop `#heading` and the canvas/`.sweep` markup. The form and delete dialogs stay outside `app-page-sweep` (ui.md §2). Add `PageSweep`, `PagePlace` to `imports`.
- [ ] T018 [US1] In `src/app/views/deck-area/deck-area.scss`, drop `@use 'page-sweep'`, `@include page-sweep.layers`, `position: relative` on `:host`, and any `.is-turning` rule (ui.md §5); keep the rest of `:host` layout and the page styles (scoped so they still reach content projected through `app-page-sweep`, which renders in the area's template and keeps its encapsulation).
- [ ] T019 [US1] Migrate `src/app/views/collection-area/collection-area.ts`: remove `providers: [CollectionTransition, PageSweep]`, the `inert` host binding, `heading` and its focus effect, the canvas/`attach` effect, `knownDepth`, `depthOf`, the `redirecting` flag, `last` and the "drive from the address" effect, and the per-render `pageOf(id)` method. Add `protected readonly pages = injectPageChange<CollectionPlace>({ ...COLLECTION_PAGES, target: () => /* routed place with depth = collections.depth(id), or null while missing / empty holding box */ })`, with the routed place a `computed` using `equal: COLLECTION_PAGES.same`. Add `shownPage = retained(() => collection id of pages.shown(), id => build page data)` and `leavingPage` likewise over `pages.leaving()`, the page data being `{ collection, color, ancestors, depth, kind, totals, children }` as `pageOf` built it (FR-016, R9). The missing-place redirect (including the landing on the parent after a delete) keeps `replaceUrl: true` and adds `info: NO_SWEEP_INFO` (FR-015). Update the class comment ("drives `CollectionTransition`").
- [ ] T020 [US1] Rewrite `src/app/views/collection-area/collection-area.html` around `<app-page-sweep [change]="pages"><ng-template pagePlace let-place let-leaving="leaving">…</ng-template></app-page-sweep>`, replacing `placeView`, the `.sweep` layer and the canvas; collection pages read `leaving ? leavingPage() : shownPage()` instead of `pageOf(id)`. Keep `h1` `tabindex="-1"`, drop `#heading`. Dialogs stay outside. In `src/app/views/collection-area/collection-area.scss` drop `@use 'page-sweep'`, `@include page-sweep.layers` and `:host`'s `position: relative`.
- [ ] T021 [US1] Delete the old units: `git rm src/app/views/deck-area/deck-turn.ts src/app/views/deck-area/deck-turn.spec.ts src/app/views/collection-area/collection-transition.ts src/app/views/collection-area/collection-transition.spec.ts src/styles/_page-sweep.scss src/app/shared/effects/page-sweep/page-sweep.service.ts src/app/core/utils/deck-turn.util.ts src/app/core/utils/deck-turn.util.spec.ts src/app/core/utils/collection-transition.util.ts src/app/core/utils/collection-transition.util.spec.ts`. Move any `deck-turn.spec.ts`/`collection-transition.spec.ts` case not already covered into `page-change.spec.ts`, `page-sweep.spec.ts` or the util specs (FR-018).
- [ ] T022 [US1] Update `src/app/views/deck-area/deck-area.spec.ts` and `src/app/views/collection-area/collection-area.spec.ts` only where they reference removed units or assert the navigation `info` shape: the deck delete landing and missing-deck redirect expect `info: { sweep: false }`; the collection redirects expect `info: { sweep: false }`. Add a deck-area case: during a close (deck → list), the `.sweep` layer shows the deck header, and it stays whole when the deck is removed mid-sweep (FR-004). Add a collection-area case: a collection removed mid-sweep keeps its outgoing page content (ui.md §3).
- [ ] T023 [US1] In `src/app/app.routes.ts`, reword the matcher comments' "page turn" to "page change" (R12, FR-017). Then checkpoint: run the full suite and lint via `test-runner` (prune suppressions for deleted/renamed files), run `design-auditor` against DESIGN.md Motion ("Page sweep", "Collections page change", "Decks page change") and `ui.md`, fix everything, then commit Phase 3 ("Page transitions: areas on the shared page change").

**Checkpoint**: Both areas run on the shared system; User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - A new area gets page changes without copying code (Priority: P2)

**Goal**: Confirm the page-change state machine, canvas wiring, outgoing layer and input blocking each exist exactly once (SC-002, SC-003), and record the convention for future areas.

**Independent Test**: The greps in T024 return only the shared files; `page-change.spec.ts` covers first place, sweep, instant swap, reduced motion and a change during a change (US2 scenario 3).

- [ ] T024 [US2] Verify single sources across `src/app/` (SC-002, SC-003, FR-017): `.sweep`, `canvas.dust`/`class="dust"`, `inert`, `attach(`, `FRONT_BAND`/`--band`, `NavigationStart`, `prefers-reduced-motion` in page-change code, `deckTurn`, `redirecting`, `pendingClose`, `turning`, `DeckTurn`, `CollectionTransition`, `deck-dust`, `page turn` appear only in `src/app/shared/effects/page-sweep/` and `src/app/core/utils/{page-change,sweep-dust,deck-pages,collection-pages}.util.ts` (or nowhere). Remove any leftover in `src/app/views/deck-area/` or `src/app/views/collection-area/`.
- [ ] T025 [US2] Propose to the user the `.claude/docs/architecture.md` edits the plan names (plan.md "Constitution Check"): in **Routing**, an area with pages uses `injectPageChange` with a `PageRule` and `<app-page-sweep>`, and marks instant navigations with `NO_SWEEP_INFO` (replacing the deck/collection "page turn" wording); in the **`shared/` domain folders** bullet, `effects/` holds the page sweep. Apply them only after the user reviews the edit (CLAUDE.md "Maintaining these files").
- [ ] T026 [US2] Checkpoint: run the full suite and lint via `test-runner`, fix everything, then commit Phase 4 ("Page transitions: single sources").

**Checkpoint**: User Stories 1 and 2 hold; a new area needs only a place type, a `PageRule` and the `<app-page-sweep>` tag.

---

## Phase 5: User Story 3 - Quick successive navigations stay clean (Priority: P2)

**Goal**: Interrupted changes finish at once, start fresh or settle the dust (FR-008, FR-009), in both areas, with input never left blocked (SC-004).

**Independent Test**: quickstart.md "Manual" step 5 in both areas; the interrupt cases below pass.

### Tests for User Story 3

- [ ] T027 [P] [US3] Add interrupted-change cases to `src/app/shared/effects/page-sweep/page-change.spec.ts` (data-model `go` steps 2–5): a sweep during a sweep finishes the old run and starts a new `run` object from the place just reached (`leaving` = the previously shown place); an instant swap during a sweep (rule `null`, `NO_SWEEP_INFO`, reduced motion) leaves `run`/`leaving` `null` and `shown` = target; returning to the place already shown during a sweep finishes it and starts nothing; the old run's late `end` is ignored; a redirect back to the place already shown (`NO_SWEEP_INFO`, same place) does not make the next navigation instant (spec edge case, FR-015).
- [ ] T028 [P] [US3] Add interrupt cases to `src/app/shared/effects/page-sweep/page-sweep.spec.ts`: when `run` goes `null` mid-sweep, the `.sweep` layer is removed, `inert` cleared, and the dust settles (the canvas is cleared no later than `SETTLE_MAX_MS` after the interrupt, not at once and not after a further `SWEEP_MS` of front motion) (FR-009, SC-004); a new run mid-sweep resets `--front` and restarts the dust; with no 2D context available, a run still ends on time.
- [ ] T029 [P] [US3] Add area-level interrupt cases: in `src/app/views/collection-area/collection-area.spec.ts`, navigate list → collection, then before `SWEEP_MS` trigger the missing-place redirect; assert the final page is correct, the host is not inert, and the dust settles instead of the old abrupt `stop()` (the one intended behavior change, FR-009). In `src/app/views/deck-area/deck-area.spec.ts`, open a deck from the tile, then before `SWEEP_MS` navigate back via side-nav "Decks" (a new close sweep) and assert the final page is the list with input unblocked after it ends.

### Implementation for User Story 3

- [ ] T030 [US3] Fix whatever T027–T029 expose in `src/app/shared/effects/page-sweep/page-change.ts`, `page-sweep.ts` or `sweep-loop.ts` (expected: none, since Phase 2 built R5 in). Then checkpoint: run the full suite and lint via `test-runner`, fix everything, then commit Phase 5 ("Page transitions: interrupted changes").

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T031 Run `npm run build` and confirm the `angular.json` budgets hold, including `anyComponentStyle` for `src/app/shared/effects/page-sweep/page-sweep.scss` (quickstart "Automated" step 3). Fix the cause rather than raising a budget.
- [ ] T032 Run quickstart.md "Manual" steps 1–6 with the `run` skill against the user's running dev server (never start or stop it), motion on and with reduced motion emulated; fix any difference from DESIGN.md Motion (SC-001, SC-004).
- [ ] T033 Final `design-auditor` pass against DESIGN.md Motion and `specs/013-page-transitions/ui.md` (SC-006); fix what it reports.
- [ ] T034 Checkpoint: run the full suite and lint via `test-runner`, fix everything, then commit the polish phase ("Page transitions: polish").

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: after T000.
- **Foundational (Phase 2)**: after Setup (imports `@utils/sweep-dust.util`). Blocks all stories.
- **US1 (Phase 3)**: after Phase 2. MVP.
- **US2 (Phase 4)**: after US1 (it verifies the areas no longer copy the wiring).
- **US3 (Phase 5)**: after Phase 2 for T027/T028; T029 needs US1's migrated areas. Can run before or alongside US2.
- **Polish (Phase 6)**: after all stories.

### Within phases

- T003 before T004, T005, T006, T007. T006 and T007 before T010. T009 before T010/T011. T010–T012 before T013.
- T015 is independent of the area tasks. T016 → T017 → T018 (deck area); T019 → T020 (collection area); both areas before T021 (deletions) and T022 (area specs).

### Parallel Opportunities

- Phase 2: T004, T005 together (after T003); T009 alongside T006/T007.
- Phase 3: T015 alongside the area tasks; the deck chain (T016–T018) and collection chain (T019–T020) touch different files and can run in parallel.
- Phase 5: T027, T028, T029 in parallel (different spec files).

---

## Parallel Example: Phase 2 rules

```text
Task: "T004 Rename deck-turn.util → deck-pages.util with DECK_PAGES"
Task: "T005 Rename collection-transition.util → collection-pages.util with COLLECTION_PAGES"
```

## Parallel Example: User Story 1

```text
Task: "T015 Deck tile info → SWEEP_INFO"
Task: "T016–T018 Deck area on injectPageChange + <app-page-sweep>"
Task: "T019–T020 Collection area on injectPageChange + <app-page-sweep>"
```

## Parallel Example: User Story 3

```text
Task: "T027 Interrupt cases in page-change.spec.ts"
Task: "T028 Interrupt/settle cases in page-sweep.spec.ts"
Task: "T029 Area-level interrupt cases"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T000, Phase 1, Phase 2.
2. Phase 3: both areas on the shared system, no visible change.
3. **Stop and validate**: quickstart "Manual" steps 1–4 and 6.

### Incremental Delivery

1. Setup + Foundational → shared units tested in isolation, areas untouched.
2. US1 → areas migrated, old controllers deleted (MVP).
3. US2 → single sources verified, architecture.md convention proposed.
4. US3 → interrupted changes locked down by tests.
5. Polish → build budgets, manual run, design audit.

---

## Notes

- [P] tasks = different files, no dependencies.
- Work on `feature/013-page-transitions` from T000; commit once per phase, in its checkpoint task, only after its checks pass.
- FR-009 (interrupted change settles the dust instead of clearing it) is the only intended visible change; any other difference from today is a regression.

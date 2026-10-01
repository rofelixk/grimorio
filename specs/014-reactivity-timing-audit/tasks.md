---

description: "Task list for the Reactivity & Timing Audit"
---

# Tasks: Reactivity & Timing Audit

**Input**: Design documents from `/specs/014-reactivity-timing-audit/`

**Prerequisites**: plan.md, spec.md, research.md (verdict list T1–T12, I1–I3, E1–E15, A1–A5, R1–R3; decisions R0–R9), data-model.md, contracts/internal-apis.md, quickstart.md

**Tests**: The spec requires spec changes (FR-012, FR-013, and the independent tests of US1 and US2), so spec tasks are included where a mechanism changes. There is no TDD ordering: each spec is updated in the same task group as the code it drives.

**Organization**: Phases follow the plan's implementation order. US3 (lint) lands first because it is independent and makes any later promise violation fail at once. Then come US1 and US2 (sweep loop, page change, identity wheel, cross-tab helper), and US4 (docs and record) closes.

**Verdict ids**: `T#`/`I#`/`E#`/`A#`/`R#` in a task refer to rows of [research.md § Verdict list](research.md#verdict-list), and `R1`–`R9` in "(research R#)" refer to its decisions. The router-event row ids R1–R3 are always written "row R#".

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- All paths are from the repo root; `src/app/` prefixes are spelled out.

- [X] T000 Before any other task, check out `feature/014-reactivity-timing-audit` and make its first commit: every file under `specs/014-reactivity-timing-audit/`, and nothing else. This feature has no design handoff folder.

---

## Phase 1: Setup (inventory re-check)

**Purpose**: Confirm the verdict list still matches the code before anything changes (research R0, spec edge case "a call site that moved or changed count").

- [X] T001 Run `grep -rnE "\bsetTimeout\(|\bsetInterval\(|\beffect\(|afterRenderEffect\(|\.events\.subscribe" src --include=*.ts | grep -v "\.spec\.ts"` and match every line to a row of the verdict list in `specs/014-reactivity-timing-audit/research.md` (expected: 38 lines, as 12 T + 3 I + 15 E + 5 A + 3 R). For any unmatched line, add a row to the matching table in `research.md` with location, purpose, verdict and a one-line reason judged by FR-005/FR-009/FR-010, and update the counts in R0 and the "verdict counts" sentence. For a row whose call site is gone, remove it and update the counts.
- [X] T002 Checkpoint: there is no code change in this phase, so its commit goes with Phase 2 if `research.md` changed. If it didn't change, there is nothing to commit.

---

## Phase 2: User Story 3 - Lint passes with no recorded exceptions (Priority: P2)

**Goal**: The six recorded promise violations are fixed, `eslint-suppressions.json` is pruned and deleted, and lint passes without it.

**Independent Test**: `test ! -e eslint-suppressions.json && npm run lint` passes. Adding `Promise.resolve();` as a statement in any `src/` file makes lint fail with `no-floating-promises` (quickstart §1, SC-007).

- [X] T003 [P] [US3] In `src/app/views/collection-area/collection-area.ts`, change `openCollection` and `openHolding` to `void this.router.navigate(...)` (research R7): a failed or cancelled navigation leaves the person on the current page, and the Router reports errors itself, as in the existing `void this.router.navigate` redirects (E1, E2). Change nothing else in the file.
- [X] T004 [P] [US3] In `src/app/core/services/sync.service.spec.ts`, declare each of the three `from` mocks (around lines 439, 659 and 805) as `Mock<(table: string) => unknown>` (import `Mock` from `vitest`) instead of `ReturnType<typeof vi.fn>`. Returning the thenable query object then matches the declared signature (research R8). The assertions stay the same.
- [X] T005 [P] [US3] In `src/app/shared/auth/profile-modal/profile-flow.store.spec.ts` (around line 424), type the `cloudAuth` mock so `deleteAccount` has the signature of `CloudAuthService['deleteAccount']` (returns `Promise<void>`). The `async` implementation then matches its declared type (research R8). The assertions stay the same.
- [X] T006 [US3] Run `npx eslint src --prune-suppressions` (depends on T003–T005). Confirm `eslint-suppressions.json` is now empty of entries, then delete `eslint-suppressions.json`. Confirm `eslint.config.js` doesn't reference the file; if it does, remove that reference.
- [X] T007 [US3] Through `test-runner`, run `npm run lint`, which must pass with the file gone. Then add `Promise.resolve();` as a statement in `src/app/app.ts`, confirm through `test-runner` that `npx eslint src/app/app.ts` fails with `@typescript-eslint/no-floating-promises`, and revert that line (SC-007).
- [X] T008 [US3] Checkpoint: through `test-runner`, run the full suite (`npm test`) and lint, then fix everything. Commit Phase 2 ("Reactivity audit: promise exceptions"), including `research.md` if T001 changed it.

**Checkpoint**: Lint is clean with no exceptions record. Every later phase now runs lint with no grandfathering.

---

## Phase 3: User Story 1 - Sequencing waits for what it depends on: the sweep loop (Priority: P1) 🎯 MVP

**Goal**: The page sweep's end comes from its own rAF frame instead of a parallel timer (T3). `SweepLoop` reads its host and canvas itself, so the copying effect (E3) and the unreachable no-host timer (T2) are removed.

**Independent Test**: `page-sweep.spec.ts` fakes only `requestAnimationFrame`/`cancelAnimationFrame`, and the change ends on the frame where the front completes. With `SWEEP_MS` set temporarily to `1500`, the spec still passes (quickstart §4, SC-005).

- [X] T009 [US1] In `src/app/shared/effects/page-sweep/sweep-loop.ts` (research R1, R2, data-model "SweepLoop run", contract `SweepLoop`):
  - Inject the host with `inject(ElementRef<HTMLElement>).nativeElement` (the loop is provided by `PageSweep`, so this is the `PageSweep` host).
  - Remove `attach()` and the stored `canvas`/`host` fields.
  - Change `start` to `start(dir, page: { layer: () => HTMLElement | null; dust: () => HTMLCanvasElement | null }, onCrossed)`. The run reads `page.dust()` on its first frame, as it already reads `layer`.
  - Remove the no-host branch and its `setTimeout` (T2), and remove the `endTimer` field and its `setTimeout`/`clearTimeout` (T3).
  - In `step()`, call `onCrossed` exactly once, on the first frame where `elapsed >= SWEEP_MS` and the run isn't settling. This is the frame where `turning` turns false and `settleAt` is set.
  - `settle()` only marks the run settling, or stops a run that hasn't drawn yet.
  - `stop()` clears the canvas of the run it stops (`run.dust.ctx`).
  - Guarantee: `onCrossed` never runs after `settle()`, `stop()`, another `start()` or destroy (FR-011).
  - Keep `SWEEP_MS` exported.
- [X] T010 [US1] In `src/app/shared/effects/page-sweep/page-sweep.ts`, remove the `effect(() => this.loop.attach(...))` (E3). The run watcher (E4) passes `dust: () => this.dust()?.nativeElement ?? null` next to `layer` in its `this.loop.start(...)` call. Keep E4 and E5 as they are, and remove any unused imports (depends on T009).
- [X] T011 [US1] In `src/app/shared/effects/page-sweep/page-sweep.spec.ts`, fake only `requestAnimationFrame`/`cancelAnimationFrame`: drop `setTimeout`/`clearTimeout` from `toFake` (research R1). Assert that the change ends, with `leaving()` cleared and the page no longer inert, on the frame whose elapsed time reaches `SWEEP_MS`, and not before. Add a case where a second change mid-sweep supersedes the first and `onCrossed` (`end`) runs once only. Keep the existing "cancels timers and the dust loop on destroy" case passing under rAF-only faking (rename it "cancels the dust loop on destroy"), so a destroyed owner never ends the change (FR-011). Express any time advance in terms of the imported `SWEEP_MS`, never a literal 500 (FR-012, SC-005). Keep its existing `pages.go(...)` calls for now; Phase 4 replaces them (depends on T010).
- [X] T012 [US1] Temporarily set `SWEEP_MS` to `1500` in `src/app/shared/effects/page-sweep/sweep-loop.ts`. Through `test-runner`, run `npx ng test --include='**/page-sweep.spec.ts'` and confirm it passes, then revert (quickstart §4, SC-005).
- [X] T013 [US1] Checkpoint: through `test-runner`, run the full suite and lint, then fix everything. Commit Phase 3 ("Reactivity audit: sweep loop").

**Checkpoint**: No timer remains in `sweep-loop.ts`, and the sweep ends with the drawn front.

---

## Phase 4: User Story 2 - Derived state is declared, not copied: page change (Priority: P1)

**Goal**: `PageChange` is one `linkedSignal` over the routed target and reads the router's navigation signals, so its effect (E6) and its `NavigationStart` subscription (row R3) are removed.

**Independent Test**: In `page-change.spec.ts`, setting `target` and then reading `shown()`/`leaving()`/`run()` with no `detectChanges`/`flushEffects`/tick in between gives the new state (US2 independent test, quickstart §3).

- [X] T014 [US2] In `src/app/shared/effects/page-sweep/page-change.ts` (research R3, data-model "PageChange<P> state", contract `PageChange<P>`):
  - Change the constructor to `new PageChange(rule, reducedMotion, target: () => P | null, nav: () => PageNav | null)`.
  - Replace the three writable signals with one `linkedSignal<P | null, PageState<P>>`, with source `target` and value `{ started, shown, leaving, run }`. Its computation follows the data-model transition table exactly:
    - no previous state → `{ started: to !== null, shown: to ?? rule.initial, leaving: null, run: null }`
    - `to === null` → previous state
    - `!s.started` → `{ started: true, shown: to, leaving: null, run: null }`
    - `rule.same(s.shown, to)` → `s` with `leaving`/`run` cleared if a sweep was running
    - reduced motion, `NO_SWEEP_INFO` or `rule.sweep(...) === null` → `{ started, shown: to, leaving: null, run: null }`
    - otherwise → `{ started, shown: to, leaving: s.shown, run: { dir } }`, a new run object
  - The computation reads `reducedMotion()` and `nav()` inside `untracked`.
  - `shown`, `leaving` and `run` become read-only `computed` views. `end(run)` writes `{ ...s, leaving: null, run: null }` only when `s.run === run`.
  - Remove `go()`.
  - In `injectPageChange` (same signature), remove the `effect` (E6) and the `router.events` `NavigationStart` subscription with its `DestroyRef` cleanup (row R3). Pass a `nav` that reads `router.currentNavigation() ?? router.lastSuccessfulNavigation()` and maps it to `{ trigger: nav.trigger, info: nav.extras.info }`, or `null`.
  - Before writing it, confirm in `node_modules/@angular/router` that both signals exist in 22.1 under those names. If they don't, stop and report rather than improvising.
- [X] T015 [US2] In `src/app/shared/effects/page-sweep/page-change.spec.ts`, build `PageChange` with a writable `target` signal and a writable `nav` signal (or stub). Replace every `change.go(x)` with `target.set(x)`. The assertions stay the same: behavior is unchanged (FR-013). Add one case that sets `target` and reads `shown()`/`run()` immediately, with no tick or effect flush (US2 independent test) (depends on T014).
- [X] T016 [US2] In `src/app/shared/effects/page-sweep/page-sweep.spec.ts`, replace the `pages.go(first)`/`pages.go(place)` helpers (lines ~58, ~64) with setting the test host's target signal. Keep the Phase 3 rAF-only faking (depends on T014, T011).
- [X] T017 [US2] Check `src/app/views/collection-area/collection-area.ts`, `src/app/views/deck-area/deck-area.ts` and `src/app/shared/decks/deck-tile/deck-tile.ts` for any use of `go()` or the removed `PageChange` members, and adapt them. `injectPageChange`'s signature is unchanged, so normally nothing changes. Then, through `test-runner`, run `npx ng test --include='**/collection-area.spec.ts'` and `--include='**/deck-area.spec.ts'` and fix only specs that tested the replaced mechanism (FR-013) (depends on T014).
- [X] T018 [US2] Checkpoint: through `test-runner`, run the full suite and lint, then fix everything. Commit Phase 4 ("Reactivity audit: page change").

**Checkpoint**: `page-change.ts` has no `effect(` and no `.events.subscribe`. Area navigation, browser back and `NO_SWEEP_INFO` deletes behave as before.

---

## Phase 5: User Story 2 - Derived state is declared, not copied: identity wheel (Priority: P1)

**Goal**: The identity wheel's bursts become a `linkedSignal` over the lit colors, which removes the effect (E12).

**Independent Test**: In `identity-wheel.spec.ts`, a newly lit color adds a burst on the next read of `bursts()`, with no effect flush (quickstart §3).

- [X] T019 [P] [US2] In `src/app/shared/ds/identity-wheel/identity-wheel.ts`, replace `signal<Burst[]>` plus the effect (E12) with `bursts = linkedSignal<Color[], Burst[]>({ source: this.lit, computation: (lit, prev) => ... })` (research R4, data-model "IdentityWheel.bursts"):
  - With no previous value, return `[]`.
  - Otherwise return `prev.value` plus one `makeBurst(color)` for each color in `lit` that isn't in `prev.source`, unless reduced motion is on (read inside `untracked`).
  - Removing a burst when its animation ends stays a local `bursts.update(...)`.
  - Keep the mote interval (I3) and its destroy cleanup unchanged.
- [X] T020 [US2] In `src/app/shared/ds/identity-wheel/identity-wheel.spec.ts`, assert that lighting a new color adds exactly one burst on the next `bursts()` read, with no effect flush. The initial render has none, reduced motion adds none, and an animation end removes the burst. Remove effect-flush steps that only existed for the old effect (FR-013) (depends on T019).
- [X] T021 [US2] Checkpoint: through `test-runner`, run the full suite and lint, then fix everything. Commit Phase 5 ("Reactivity audit: identity wheel").

---

## Phase 6: User Story 1 - Sequencing waits for what it depends on: cross-tab helper (Priority: P1)

**Goal**: The cross-tab test helper waits for the fake channel's delivery and for the receiving service's `refresh()` instead of one macrotask (T12).

**Independent Test**: No `setTimeout` remains in `src/app/core/testing/cross-tab.ts`, no service spec calls `settleChannel()`, and the six service specs pass (quickstart §3, FR-012).

- [X] T022 [US1] In `src/app/core/testing/cross-tab.ts` (research R5, contract `@testing/cross-tab`):
  - Replace `settleChannel()` with `delivered(): Promise<void>`, which resolves after one microtask, the fake channel's single `queueMicrotask` delivery hop.
  - Make `otherCopy().announce(kind, profileId)` return `delivered()`.
  - Add `nextRefresh(service: { refresh(): Promise<void> }): Promise<void>`. It spies on that instance's `refresh` with `vi.spyOn` and resolves when the next call's promise settles. It rejects if that call rejects, and restores the spy after the first call.
  - Remove the `setTimeout`. Production code stays unchanged.
- [X] T023 [P] [US1] In `src/app/core/services/card.service.spec.ts`, replace each `settleChannel()`. Where the spec checks outgoing announcements, await `delivered()`. Where it checks the refreshed state, call `const refreshed = nextRefresh(service)` before `announce`, then `await refreshed` (depends on T022).
- [X] T024 [P] [US1] Make the same replacement in `src/app/core/services/collection.service.spec.ts` (depends on T022).
- [X] T025 [P] [US1] Make the same replacement in `src/app/core/services/deck.service.spec.ts` (depends on T022).
- [X] T026 [P] [US1] Make the same replacement in `src/app/core/services/planar-selection.service.spec.ts` (depends on T022).
- [X] T027 [P] [US1] Make the same replacement in `src/app/core/services/planechase-game.service.spec.ts` (depends on T022).
- [X] T028 [P] [US1] Make the same replacement in `src/app/core/services/profile-store.service.spec.ts`. If `ProfileStore` has no `refresh()` and reacts another way, wait on the method its cross-tab handler calls, and record that in `research.md` under R5 (depends on T022).
- [X] T029 [US1] Run `grep -rn "settleChannel" src` and confirm there are no results. Through `test-runner`, run the six service specs.
- [X] T030 [US1] Checkpoint: through `test-runner`, run the full suite and lint, then fix everything. Commit Phase 6 ("Reactivity audit: cross-tab waits").

---

## Phase 7: User Story 4 - Every kept timer and effect explains itself (Priority: P3)

**Goal**: The architecture guide states the general rule, the command reference drops the suppressions workflow, and the verdict list matches the code exactly.

**Independent Test**: Every line of the inventory grep matches a **keep** row, and no convert or remove row (T2, T3, T12, E3, E6, E12, row R3) still has a call site (quickstart §2, SC-002).

- [X] T031 [P] [US4] In `.claude/docs/architecture.md`, under "Lint and budgets", drop the `eslint-suppressions.json` sentences and keep the rule list (research R9). Add a new bullet, worded as in research R9 ("**Timers, effects and router events**: …"), next to the existing `linkedSignal` bullet. It is the only place the general rule lives (FR-016).
- [X] T032 [P] [US4] In `.claude/docs/commands.md`, drop the paragraph about `--prune-suppressions`/`--suppress-rule` and `eslint-suppressions.json` (research R9). Keep "Lint one file: `npx eslint <path>`."
- [X] T033 [US4] Re-run the inventory grep from T001 and match every line to a **keep** or **keep (fallback)** row in `specs/014-reactivity-timing-audit/research.md` (31 at plan time, plus any added in T001 or during implementation). Confirm that no line matches T2, T3, T12, E3, E6, E12 or row R3. Add any new call site introduced by this spec as a row (spec edge case). Confirm no justification comments were added at kept call sites (FR-016).
- [X] T034 [US4] Checkpoint: through `test-runner`, run the full suite and lint, then fix everything. Commit Phase 7 ("Reactivity audit: docs and record").

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all stories (SC-001, SC-006).

- [X] T035 Through `test-runner`, run `npm test` and `npm run lint`, and run `npm run build` (production build with budgets). All three must pass with zero errors, and `test ! -e eslint-suppressions.json` must hold (SC-001).
- [X] T036 Run `git diff --name-only main -- '*.html' '*.scss'`. If any template or stylesheet changed, run `design-auditor` and fix what it reports. Otherwise, record that no UI file changed.
- [X] T037 Hand the manual pass in `specs/014-reactivity-timing-audit/quickstart.md` §5 to the maintainer, who runs it on their own dev server, with motion on and with reduced motion (SC-006). Optionally pre-check the collection and deck page changes with the `run` skill against the maintainer's running server, without starting or stopping it. Fix any difference reported.
- [X] T038 Checkpoint: through `test-runner`, run the full suite and lint, then fix everything. Commit the polish phase ("Reactivity audit: polish") if anything changed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **T000** comes before everything.
- **Phase 1 (Setup)** has no dependencies. It may add rows that later phases must respect.
- **Phase 2 (US3)** depends on Phase 1 and comes first by the plan's order, so later phases lint with no grandfathering.
- **Phase 3 (US1, sweep loop)** depends on Phase 2.
- **Phase 4 (US2, page change)** depends on Phase 3, because both edit `page-sweep.spec.ts` and T016 builds on T011.
- **Phase 5 (US2, identity wheel)** is independent of Phases 3–4 and can start any time after Phase 2.
- **Phase 6 (US1, cross-tab)** is independent of Phases 3–5 and can start any time after Phase 2.
- **Phase 7 (US4)** depends on Phases 2–6, since the inventory must reflect every conversion.
- **Phase 8 (Polish)** depends on everything.

### User Story Dependencies

- **US3** has no dependency on other stories.
- **US1** has two parts. The sweep loop (Phase 3) and the cross-tab helper (Phase 6) are independent of each other.
- **US2** has two parts. Page change (Phase 4) shares `page-sweep.spec.ts` with US1's Phase 3, so it goes after it. The identity wheel (Phase 5) is independent.
- **US4** comes last, because it records the outcome of all the others.

### Within Each Phase

- Production change, then its spec, then the targeted run, then the checkpoint.
- Each phase ends with one commit in its checkpoint task. There are no per-task commits.

### Parallel Opportunities

- Phase 2: T003, T004 and T005 touch three different files.
- Phases 5 and 6 can run alongside Phases 3–4 (different files).
- Phase 6: once T022 lands, T023–T028 touch six different spec files.
- Phase 7: T031 and T032 touch two different docs.

---

## Parallel Example: Phase 6 (US1, cross-tab)

```bash
# After T022 (cross-tab.ts) lands, launch the six service-spec migrations together:
Task: "Replace settleChannel() in src/app/core/services/card.service.spec.ts"
Task: "Replace settleChannel() in src/app/core/services/collection.service.spec.ts"
Task: "Replace settleChannel() in src/app/core/services/deck.service.spec.ts"
Task: "Replace settleChannel() in src/app/core/services/planar-selection.service.spec.ts"
Task: "Replace settleChannel() in src/app/core/services/planechase-game.service.spec.ts"
Task: "Replace settleChannel() in src/app/core/services/profile-store.service.spec.ts"
```

## Parallel Example: Phase 2 (US3)

```bash
Task: "void navigate in src/app/views/collection-area/collection-area.ts"
Task: "Type the from mocks in src/app/core/services/sync.service.spec.ts"
Task: "Type the cloudAuth mock in src/app/shared/auth/profile-modal/profile-flow.store.spec.ts"
```

---

## Implementation Strategy

### MVP First

1. T000 and Phase 1: the branch, plus the inventory re-checked.
2. Phase 2 (US3): lint is clean with no record, a small isolated win.
3. Phase 3 (US1, sweep loop): the timer-guessed sequencing the backlog names. **Stop and validate** with the `SWEEP_MS` duration check (T012).

### Incremental Delivery

Each phase from 2 to 7 is one commit that leaves the suite, lint and the app behavior intact, so the work can stop after any checkpoint. The verdict list stays truthful as long as Phase 7 runs at the end of whatever was done.

---

## Notes

- Verdicts of **keep** need no task beyond T001 and T033. No comments are added at kept call sites (FR-016).
- No production code may special-case tests (spec edge case "test environment has no animations").
- Pending items #39 and #40 (sync, storage) are out of scope, even where T9 and T11 touch them.
- Work on `feature/014-reactivity-timing-audit` from T000, and commit once per phase in its checkpoint task, only after its checks pass.

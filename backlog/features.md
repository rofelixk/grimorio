# Feature roadmap

Planned specs, in build order: earlier specs lay groundwork the later ones rely on. Item numbers (`#N`) point to [pending-items.md](pending-items.md); each item's detail lives there, so an entry here only groups, orders and scopes them.

Each entry:

- **Status**: `planned` → `specifying` (spec folder exists, fill in **Spec**) → `in progress` → `done`.
- **Goal**: the outcome, one or two sentences; the seed for `/speckit-specify`.
- **Items**: backlog items it absorbs. Check each still applies before specifying.
- **Why here**: what it needs from earlier specs, or what later specs need from it.
- **Open decisions**: questions to settle during `/speckit-clarify`.

When a spec ships, set it to `done` and delete its items from pending-items.md.

---

## 1. Codebase baseline

- **Status**: planned
- **Spec**: —
- **Goal**: A smaller, guarded codebase: dead code gone, one default-identity source, and lint rules, bundle budgets and tests that catch regressions in the refactors that follow.
- **Items**:
  - #14 Remove unused code
  - #11 One `effectiveColors` on `IdentityService`
  - #24 Bundle budgets
  - #25 Stricter lint rules
  - #22 Specs for untested logic (non-card files only)
  - #26 Stale nav section in architecture.md
- **Why here**: Every later spec is a refactor and runs against these guardrails. Removing dead code first keeps the new lint rules from flagging code about to be deleted.
- **Open decisions**: Which lint rules land as errors vs. warnings; budget thresholds.

## 2. Storage & sync foundation

- **Status**: planned
- **Spec**: —
- **Goal**: A safe, shared data layer: writes that report failure, storage the browser won't evict, correct behavior with several tabs open, and a sync split into per-entity steps that scale past today's sizes.
- **Items**:
  - #18 One shared write queue, surfacing failed saves
  - #27 Request persistent storage
  - #29 Multi-tab IndexedDB handling
  - #30 Sync paging for collections and decks
  - #17 Split `SyncService` into sync steps
- **Why here**: The data layer every feature writes through. The card redesign and future entities plug into the write queue and the sync-step pattern instead of copying the old shape. Independent of spec 3; the two can swap.
- **Open decisions**: How a failed save is shown (toast, persistent state?); whether tabs resync through `BroadcastChannel` or just close on `versionchange`; paging vs. incremental pull (`updated_at > lastSyncedAt`).

## 3. Modals, focus & auth stores

- **Status**: planned
- **Spec**: —
- **Goal**: One settled modal foundation: shared height tracking, one focus helper, the compact modal's fluid height in DESIGN.md, and auth flow stores small enough to change safely.
- **Items**:
  - #6 Unify `CompactModal` height tracking with `FluidFace`
  - #7 DESIGN.md: compact modal fluid height
  - #19 Focus-management helper
  - #16 Split the auth flow stores
- **Why here**: Modals are the shell for most future UI; settling them now means later specs just use them. Needs spec 1's tests before splitting the stores.
- **Open decisions**: Helper vs. directive for focus; how the shared cloud sub-store is provided to both modals.

## 4. Page transitions

- **Status**: planned
- **Spec**: —
- **Goal**: One page-change system shared by decks and collections, with `PageSweep` as a reusable component, so any new area gets page transitions without copying code.
- **Items**:
  - #1 One page-change controller
  - #2 `DeckTurn`: `pendingClose` → `leaving` model
  - #3 `PageSweep` as a component or directive
  - #4 Drop `PageSweep.start`'s `active` callback
  - #5 Collections: `redirecting` flag → navigation `info`
  - #8 Memoize `pageOf`
  - #9 `--band` duplication
  - #10 Naming leftovers
- **Why here**: The largest group and pure refactoring, so it needs spec 1's guardrails. The card redesign can then reuse it.
- **Open decisions**: #4's intended dust behavior when a change finishes without a new sweep; component vs. directive for `PageSweep`.

## 5. Reactivity & timing audit

- **Status**: planned
- **Spec**: —
- **Goal**: Timers and effects used only where they belong: sequencing tied to animation events or signals, derived state as `computed`/`linkedSignal`.
- **Items**:
  - #23 `setTimeout` audit
  - #28 `effect` audit
- **Why here**: Specs 3 and 4 rewrite many of these effects and timers; auditing earlier would redo work.
- **Open decisions**: None yet.

## 6. Mobile landscape

- **Status**: planned
- **Spec**: —
- **Goal**: A layout for short, wide screens (a phone in landscape) across the app shell, top bar, modals and the Planechase phone dock.
- **Items**:
  - #15 Add proper mobile-landscape layout
- **Why here**: Checks the shell, modals and page layouts, which specs 3 and 4 settle.
- **Open decisions**: The height threshold; whether DESIGN.md gains a landscape breakpoint.

---

## Deferred: card redesign

Not a scheduled spec yet. These items touch card code the redesign will replace, so they wait for it:

- #13 Sync card artist data
- #20 Retire `ThemeService` (its two users are card code)
- #21 Retire `_modal.scss` / `_dropdown.scss` (two of the four users are card components)
- #22's card files: `card-import.util.ts`, `card-color.util.ts`

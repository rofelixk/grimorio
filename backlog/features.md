# Feature roadmap

Planned specs, in build order: earlier specs lay groundwork the later ones rely on. Item numbers (`#N`) point to [pending-items.md](pending-items.md); each item's detail lives there, so an entry here only groups, orders and scopes them.

Each entry:

- **Status**: `planned` → `specifying` (spec folder exists, fill in **Spec**) → `in progress`.
- **Goal**: the outcome, one or two sentences; the seed for `/speckit-specify`.
- **Items**: backlog items it absorbs. Check each still applies before specifying.
- **Why here**: what it needs from earlier specs, or what later specs need from it.
- **Open decisions**: questions to settle during `/speckit-clarify`.

When a spec ships, delete its entry here and its items from pending-items.md; the spec folder is the record. Entry numbers are permanent (pending-items.md refers to them), so the rest keep theirs. Shipped so far: 1 (spec 010, codebase baseline), 2 (spec 011, storage & sync foundation) and 3 (spec 012, modals, focus & auth stores).

---

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
- **Why here**: The largest group and pure refactoring, so it leans on spec 010's guardrails. The card redesign can then reuse it.
- **Open decisions**: #4's intended dust behavior when a change finishes without a new sweep; component vs. directive for `PageSweep`.

## 5. Reactivity & timing audit

- **Status**: planned
- **Spec**: —
- **Goal**: Timers and effects used only where they belong: sequencing tied to animation events or signals, derived state as `computed`/`linkedSignal`.
- **Items**:
  - #23 `setTimeout` audit
  - #28 `effect` audit
  - #37 Fix the recorded promise exceptions
- **Why here**: Specs 3 and 4 rewrite many of these effects and timers; auditing earlier would redo work. Spec 010 left its promise exceptions for this spec.
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

## Deferred: card features

Not scheduled yet. Spec 010 removed all card components, card reading (OCR), catalog lookup and CSV import, so the card features start fresh; [reference/card-features.md](reference/card-features.md) records their tuned configuration. Items waiting for them:

- #13 Sync card artist data
- #38 Card-reading guardrails (lint guard and bundle budget for `tesseract.js`)

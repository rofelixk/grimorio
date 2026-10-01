# Implementation Plan: Page Transitions

**Branch**: `013-page-transitions` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-page-transitions/spec.md`

## Summary

A refactor that gives the deck and collection areas one page-change system. Nothing is stored, no copy changes, and nothing visual changes except FR-009's settle on an interrupted change.

**Controller (#1, #2, #5)**: `PageChange<P>`, created by `injectPageChange({ ...rule, target })`, replaces `DeckTurn` and `CollectionTransition`.
- **Owns**: `shown` / `leaving` / `run`, reduced motion, the first place, finish-then-start, the `NavigationStart` capture, and the effect that follows the routed place (R1, R6).
- **Area supplies**: a pure `PageRule` (`initial`, `same`, `sweep`), `DECK_PAGES` or `COLLECTION_PAGES` (R2). A collection place carries its depth, so `knownDepth`/`depthOf` go away.
- **Decks**: move to `shown` + `leaving`, and `pendingClose` is removed (R3).
- **Marking**: one navigation `info` convention, `{ sweep: true | false }`, replaces `deckTurn` and the collections' `redirecting` flag. `sweep: false` is handled by the controller (R4).

**Sweep (#3, #4, #9)**: `<app-page-sweep [change]>` with a projected `<ng-template pagePlace>` (R7).
- **Owns**: the incoming page, the `.sweep` layer (`viewChild`), the canvas and its attach, `inert`, the scroll offset, the `--front` reset, `--band` from `FRONT_BAND` (R10), and the heading focus (R11).
- **Drawing**: the rAF/dust engine becomes `SweepLoop`, provided by the component (R8). It loses `active()` and gains `settle()`. A run going `null` settles the dust at once (R5, FR-009).

**Page data (#8)**: `retained(key, read)` gives each area a memoized, last-value-keeping signal per slot. Collections get `shownPage`/`leavingPage`, which replace `pageOf`; decks get `shownDeck`/`leavingDeck` (R9).

**Names (#10)**: `deck-dust.util` → `sweep-dust.util`, `deck-turn.util` → `deck-pages.util`, `collection-transition.util` → `collection-pages.util`, and "page turn" → "page change" (R12).

## Technical Context

**Language/Version**: TypeScript ~6.0, Angular 22 (standalone, zoneless, signals)

**Primary Dependencies**: none new. It uses `@angular/router` (`NavigationStart`, `currentNavigation().extras.info`), `requestAnimationFrame`, a 2D canvas, and `matchMedia` (`mediaQuerySignal`).

**Storage**: N/A

**Testing**: Vitest via `ng test` (jsdom). Fake timers drive `setTimeout`/`requestAnimationFrame`, with a stubbed `getContext('2d')` and `matchMedia`, as in today's `deck-turn.spec.ts`. The sweep is tested through a small test-host component.

**Target Platform**: browser/PWA (Chromium, Firefox, Safari) and the Capacitor Android WebView

**Project Type**: single-project Angular web app

**Performance Goals**: unchanged sweep timing: 500 ms front, settle ≤ 1 s. Page data is derived once per input change (FR-016), not on every render.

**Constraints**:
- No visible difference outside FR-009 (SC-001).
- DESIGN.md is not edited (FR-014).
- No text changes (FR-020).
- Existing tests change only where they move to the shared units, check FR-009, or assert the navigation `info` shape (R4: `deck-tile.spec.ts`, and the `deck-area.spec.ts` delete and redirect expectations).

**Scale/Scope**:
- **New**: `page-change.util.ts`, `page-change.ts`, the `page-sweep` component (`.ts`/`.html`/`.scss`), `page-place.ts`, `sweep-loop.ts`, plus specs.
- **Renamed**: 1 util (`sweep-dust`, + spec). 2 utils replaced by new files (+ specs).
- **Changed**: `DeckArea`, `CollectionArea` (`.ts`/`.html`/`.scss`), `DeckTile`, `app.routes.ts`.
- **Removed**: `deck-turn.ts`, `collection-transition.ts` (+ specs), `src/styles/_page-sweep.scss`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Physical-World Fidelity | Pass | No owned-card data path changes. |
| II. PT-BR-First | Pass | No copy changes (FR-020). |
| III. Free and Accessible | Pass | Nothing touched. |
| IV. Local-First, Cloud-Optional | Pass | Nothing touched. |
| V. Zoneless, Signal-Driven Angular | Pass | Standalone OnPush component and directive. State is `signal`/`linkedSignal` (`retained`). Side effects (driving `go`, starting the loop, focus) are `effect`/`afterNextRender`. No UI library. The visuals already in DESIGN.md are unchanged, and FR-009 applies DESIGN.md's existing "Settle" rule, so nothing ships undecided. |
| VI. Persistence and Sync Pattern | Pass | Not touched. |

**Post-design re-check (after Phase 1)**: still passes. Two choices are recorded rather than silent:

- **Navigation marking** (R4): the decks' missing-deck redirect now carries `info: { sweep: false }` instead of being recognized by `replaceUrl`. The deck tile's `info` becomes `{ sweep: true }`. The spec allows a shared convention (Assumptions), and the tests asserting the old shape change with it.
- **Heading focus** (R11) moves into the shared sweep. The spec leaves this to the plan (Assumptions), and the behavior is unchanged.

`architecture.md` will need updating after implementation, under CLAUDE.md's "worth adding" test (a durable convention for new areas):
- **Routing** paragraph: an area with pages uses `injectPageChange` with a `PageRule` and `<app-page-sweep>`, and marks instant navigations with `NO_SWEEP_INFO`.
- **`shared/` domain folders**: `effects/` holds the page sweep.

## Project Structure

### Documentation (this feature)

```text
specs/013-page-transitions/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── page-change.md   # Phase 1
├── ui.md                # Phase 1
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design (Phase 1 → `ui.md`)

[ui.md](ui.md) covers the new nesting under `app-page-sweep`, the settled/sweeping/interrupted/reduced-motion states, the unchanged triggers with their new `info` marking, the stylesheet move, and the focus and `inert` handling. No new visuals or copy, and no DESIGN.md change.

### Source Code (repository root)

```text
src/
├── styles/
│   └── _page-sweep.scss                          # removed: moved into the component (R7, R10)
└── app/
    ├── app.routes.ts                             # changed: "page turn" wording (R12)
    ├── core/utils/
    │   ├── page-change.util.ts                   # new: SweepDir, PageNav, PageRule, SWEEP_INFO, NO_SWEEP_INFO (R2, R4)
    │   ├── deck-pages.util.ts|.spec.ts           # new, replaces deck-turn.util (removed in US1): DeckPlace, DECK_PAGES
    │   ├── collection-pages.util.ts|.spec.ts     # new, replaces collection-transition.util (removed in US1): CollectionPlace (+depth), COLLECTION_PAGES
    │   └── sweep-dust.util.ts|.spec.ts           # renamed from deck-dust.util, content unchanged
    ├── shared/
    │   ├── decks/deck-tile/deck-tile.ts|.spec.ts # changed: [info]="SWEEP_INFO"
    │   └── effects/page-sweep/
    │       ├── page-change.ts|.spec.ts           # new: PageChange<P>, injectPageChange, retained (R1, R5, R6, R9)
    │       ├── page-sweep.ts|.html|.scss|.spec.ts # changed: service → component (R7, R10, R11)
    │       ├── page-place.ts                     # new: PagePlace directive (ng-template[pagePlace])
    │       └── sweep-loop.ts                     # new: SweepLoop, SWEEP_MS: the former service's drawing, + settle() (R5, R8)
    └── views/
        ├── deck-area/
        │   ├── deck-area.ts|.html|.scss|.spec.ts # changed: injectPageChange(DECK_PAGES), one place template, shownDeck/leavingDeck
        │   └── deck-turn.ts|.spec.ts             # removed
        └── collection-area/
            ├── collection-area.ts|.html|.scss|.spec.ts # changed: injectPageChange(COLLECTION_PAGES), shownPage/leavingPage, redirect info
            └── collection-transition.ts|.spec.ts # removed
```

**Structure Decision**: the existing single Angular project.
- **The component, its controller and its loop** go in `shared/effects/page-sweep/`, the folder the sweep already lives in.
- **Pure rules and types** go in `core/utils/`, per architecture.md.
- **The area views** keep only their rule, their target place, their redirects and their page markup.

## Complexity Tracking

No constitution violations to justify.

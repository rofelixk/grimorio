# Implementation Plan: Planar Card Preview in Deck Settings

**Branch**: `007-planar-card-preview` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-planar-card-preview/spec.md`

## Summary

This adds a card preview to "Baralho planar" and a default-off selection for the planar deck. The
preview shows the card's large image with its PT-BR (or English) type line, text and unlit ability
plate. How it opens decides how it looks. A resting mouse or pen opens a control-free popover,
placed beside the tile with `position: fixed` by a pure placement function. A touch long-press,
right-click, Menu or Shift+F10 opens a native `<dialog>` with previous/next and an on/off toggle:
full-bleed at 640 px or less, centered with the ring above that. A view-scoped
`PlanarPreviewController` owns the preview state, the timers and a history entry, so the system
back button closes the dialog instead of the deck settings. The default selection is a hand-kept
list of 8 oracle ids that `enabledCards(cards, null)` excludes. Nothing new is saved or synced.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular 22 (standalone, zoneless, signals)

**Primary Dependencies**: none new. Uses the existing `PlanarImage`/`PlanarImageService`, `PlanarTile`, `PlanarCard`, `_controls.scss` and `_tokens.scss`

**Storage**: none new. `PlanarSelection` (IndexedDB `meta`) is unchanged in shape, and only the meaning of `null` changes (data-model.md)

**Testing**: Vitest via `ng test` (jsdom, fake timers, synthetic pointer events); manual checks per quickstart.md, including a real phone

**Target Platform**: browser/PWA (desktop and mobile) and Capacitor Android WebView

**Project Type**: single-project Angular web app

**Performance Goals**: the popover opens within 300 ms of the pointer resting (SC-002 < 500 ms), switches between tiles without a close/reopen, and a cached image shows immediately

**Constraints**: works offline for images already seen (existing cache); the preview adds no downloads beyond the previewed card's image; fits 320 px to desktop; honors reduced motion

**Scale/Scope**: 151 cards in the catalog, 8 default-off; one view modified, 3 components new or changed, 3 utils

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Physical-World Fidelity | N/A | Doesn't touch owned-card data |
| II. PT-BR-First | Pass | All new copy is PT-BR in `DECK` (ui.md §7). Card and set names and untranslated text stay English with `lang="en"`, as in 006 FR-023 |
| III. Free and Accessible | Pass | No monetization surface |
| IV. Local-First, Cloud-Optional | Pass | Planechase stays ungated; the default list ships with the app; images use the existing offline cache |
| V. Zoneless, Signal-Driven Angular | Pass | Standalone OnPush components, signals/`computed`/`linkedSignal`/`effect`, native `<dialog>`, no UI framework. The new visuals go into DESIGN.md before they're built (FR-015) |
| VI. Persistence and Sync Pattern | Pass | No new entity. `PlanarSelectionService` and its sync are untouched; `null` still means "never saved" and is never uploaded |

**Post-design re-check (after Phase 1)**: still passes. One spec amendment was made during
research (R1): FR-004 and SC-006 are reworded because 006's tiles already load `images.large`.
It's a scope correction, not a constitution deviation.

## Project Structure

### Documentation (this feature)

```text
specs/007-planar-card-preview/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── components.md    # Phase 1
├── ui.md                # Phase 1
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design (Phase 1 → `ui.md`)

[ui.md](ui.md) covers the modified deck settings and tile, the new hover popover, and the preview
dialog in its wide and narrow variants: layout, states, flow, reuse, accessibility and PT-BR copy.

### Source Code (repository root)

```text
DESIGN.md                                              # + "Card preview" under Gameplay: Planechase (FR-015)
src/app/core/data/planechase/
└── default-off.ts                                     # new: DEFAULT_OFF_IDS (FR-016)
src/app/core/models/planar-selection.model.ts          # comment: null → default list
src/app/core/utils/
├── planar-selection.util.ts                           # enabledCards(null) applies default; initialDisabledIds()
├── planar-card-text.util.ts                           # new: text/lang/plate logic shared with PlanarCard
├── planar-preview.util.ts                             # new: placePopover(), visibleOrder()
└── planechase-copy.ts                                 # DECK: hintPointer/hintTouch + preview keys
src/app/shared/ds/themed-modal/
├── _ring.scss                                         # new: ring extracted from themed-modal.scss
└── themed-modal.scss                                  # @use 'ring'
src/app/shared/gameplay/
├── planar-card/                                       # uses planarCardText()
├── planar-tile/                                       # gestures, hold glow, accessible description
├── planar-preview/                                    # new: PlanarPreviewContent
└── planar-preview-dialog/                             # new: PlanarPreviewDialog (narrow | wide)
src/app/views/planechase-deck/
├── planechase-deck.{ts,html,scss}                     # hosts popover and dialog; draft default; hint
└── planar-preview.controller.ts                       # new: view-scoped state, timers, history
```

Each new or changed unit gets a colocated `.spec.ts`.

**Structure Decision**: the existing single Angular project. The shared presentation goes under
`shared/gameplay/` (the Planechase domain folder), the view-only orchestration next to its view,
and the pure logic in `core/utils/`.

## Complexity Tracking

No constitution violations to justify.

# Implementation Plan: Cards

**Branch**: `015-cards` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-cards/spec.md`, plus the design handoff in `design_handoff_cards/` (README, `UPDATE-D1b-duplicata-multipla.md`, mocks)

## Summary

Collection pages get their cards, and adding them works through the catalog.

**Catalog**:
- **Client**: an anonymous Supabase client in a new `CardCatalogService`.
- **Search**: by an accent-free `search_name` key (trigram-indexed), 100 per page with a 101-row probe. Only the latest answer is kept.
- **Details**: one embedded `cards → printings` request per picked card supplies the printings and the card-level fields.
- **Catalog sync**: `sync:scryfall` also records each printing's artist and per-printing face images (backlog #13).

**Owned cards**:
- **New fields**: `CardEntry` gains `artist?` and a required `addedAt`, which orders the list.
- **Writes**: `CardService` now writes per row (`writeRows`), and gains `mergeInto` for the duplicate choices (FR-015/FR-019).
- **Sync**: carries the two new columns; nothing else in the sync changes.

**UI**:
- **Collection area**:
  - every collection page and the holding box move to the handoff's layout: a sticky header, a sticky side summary, and a grid of 5b tiles in "Só imagens" (6 columns) or "Com detalhes" (4 columns) with the identity-colored hover;
  - the empty state's "Adicionar cartas" becomes live.
- **Modals**: a view-scoped `CardFlow` drives the search modal (`CompactModal` 720), the add/edit modal (880, two panes, colored by the card's identity), the duplicate notices D1a/D1b, and the locked "Carta adicionada em outra coleção" notice.
- **New primitives**: a `SelectList` dropdown and a `.check` control.
- **DESIGN.md**: gains the Cards section, card colors (silver, gold, neutral), motion and the new primitives before any UI is built.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular 22 (standalone, zoneless, signals)

**Primary Dependencies**: none new. It uses `@supabase/supabase-js` (a new anonymous catalog client), `idb` (`writeRows`), `CompactModal`, `FluidHeight`, `RovingRadios`, `ToastService`, `CollectionRow`/`CreateRow`, and `_controls.scss`/`_tokens.scss` (existing `spark`/`spin-angle` keyframes).

**Storage**:
- **IndexedDB**: no version bump. `cards` values gain `addedAt`/`artist`, and user mutations go through `writeRows`.
- **localStorage**: `grm-card-view:{profileId}` holds the display mode.
- **Supabase**: migration `015_cards` adds `printings.artist`/`faces`, `cards.search_name` plus a trigram index, and `card_entries.artist`/`added_at`. See [data-model.md](data-model.md) and [contracts/supabase.md](contracts/supabase.md).

**Testing**:
- Vitest via `ng test` (jsdom, `fake-indexeddb`, fake timers for the debounce). The catalog is swapped with a fake `CardCatalogService` provider.
- A new `@testing/intersection-observer` helper.
- Manual scenarios in [quickstart.md](quickstart.md).

**Target Platform**: browser/PWA (desktop and mobile) and the Capacitor Android WebView

**Project Type**: single-project Angular web app

**Performance Goals**:
- First search page about 1 s after the typing pause (SC-002): a 250 ms debounce plus an indexed `ilike`.
- A collection of several thousand cards opens without a perceptible wait (SC-004): one `byLocation` index, `content-visibility: auto` tiles, lazy images.

**Constraints**:
- The catalog needs the network. Listing and editing details work offline, and a printing change degrades in place (FR-024).
- No raw error text (FR-025).
- No sync started by the flows (FR-023).
- Profile-isolated.
- Works from 320 px wide, and reduced motion is honored.

**Scale/Scope**:
- Changed: 1 view, 1 controller, 1 shell change (`CompactModal`).
- New: 8 shared components (`shared/cards/` ×7 and `shared/ds/select-list`), 2 services (catalog, view mode; `CardService` changed), 3 utils modules plus `firstLeaf` and 1 copy file, 1 model file.
- 1 migration, 1 script change, and DESIGN.md additions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Physical-World Fidelity | Pass | Every added card lands in exactly one leaf collection. When subcollections appear mid-add, it goes to the first leaf and the person is told where (FR-017, R10). Duplicates are never silently created or hidden (R9, SC-005). Edits never change the location. |
| II. PT-BR-First | Pass | All copy lives in `card-copy.ts` (ui.md §7). Catalog failures map to `offline`/`failed` PT-BR copy, never `error.message` (R6). The search's English-name limit is stated in its empty state. |
| III. Free and Accessible | Pass | No limits beyond a typo guard of 9999 per row (R20). No upsell. |
| IV. Local-First, Cloud-Optional | Pass | The catalog is public-read with an anonymous client, so it works with a local-only profile. Owned cards are saved locally first and reach the account only through a sync. Listing and editing work offline, and the artist is stored on the card so the edit modal works offline (R13). The holding box and cards are profile-isolated, and the view-mode key is per profile and removed on delete. |
| V. Zoneless, Signal-Driven Angular | Pass | Standalone OnPush components. `computed` for `byLocation`, the matches and the palette; `linkedSignal` for the view mode; `effect` only for DOM, timer and observer work and the close-on-missing redirect. Native `<dialog>` via `CompactModal`, with no UI framework. The DESIGN.md additions (ui.md §5) land before the UI is built. |
| VI. Persistence and Sync Pattern | Pass | `CardService` keeps the full entity shape. Moving its user writes to `writeRows` adopts the per-row variant spec 008 already justified (R7). The sync reuses `reconcileEntities` unchanged. The migration adds columns only (no new table); `added_at` is `not null default now()`, and the existing grants and RLS cover the new columns. |

**Post-design re-check (after Phase 1)**: still passes.

**Deviations from the spec or handoff**, explicit and justified, none needing a spec amendment:
1. **Extra catalog columns**: `printings.faces` and `cards.search_name` go beyond the spec's assumption that the artist is the only catalog change. Both are additive and needed for FR-012 (faces per printing) and FR-006 (accent-insensitive matching). See R2 and R3.
2. **Toast color**: toasts keep their host's roles instead of the handoff's collection color (R14).
3. **The 008 split row**: it moves into the side column, since the handoff dropped it but it is the only way to split a collection holding cards (ui.md §2.1).
4. **The quantity error**: it reads "de 1 a 9.999" (R20) instead of the handoff's "de 1 ou mais".

## Project Structure

### Documentation (this feature)

```text
specs/015-cards/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── services.md      # Phase 1: models, utils, services, components, CardFlow
│   └── supabase.md      # Phase 1: migration 015_cards, script change, client calls
├── ui.md                # Phase 1
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design (Phase 1 → `ui.md`)

[ui.md](ui.md) covers:
- the collection page in its three kinds and the holding box (sticky header, side summary, grid, toggle, hover);
- the search modal, the add/edit modal and both notices;
- the new `SelectList` and `.check`;
- layout per breakpoint (including the phone layout the handoff leaves open), states mapped to requirements, flow, reuse and DESIGN.md additions, accessibility, and all PT-BR copy.

### Source Code (repository root)

```text
DESIGN.md                                   # + Card colors, Cards section, card motion, CompactModal sizes, SelectList, .check (ui.md §5)
scripts/sync-scryfall.ts                    # + artist, faces (printings), search_name (cards)
src/styles/_controls.scss                   # + .check
src/app/core/models/
├── card.model.ts                           # + artist?, addedAt, CARD_FINISHES/CONDITIONS/LANGUAGES, MAX_QUANTITY
└── catalog.model.ts                        # new: CatalogCard, CatalogPrinting, CatalogCardDetail, SearchPage, CatalogError
src/app/core/services/
├── card-catalog.service.ts                 # new (R1, R2, R4, R6)
├── card-view-mode.service.ts               # new (R18)
├── card.service.ts                         # byLocation, add stamps addedAt, writeRows, mergeInto (R7, R8)
├── profile-lifecycle.service.ts            # forget the view-mode key on delete
└── sync/sync-rows.ts                       # artist, added_at
src/app/core/utils/
├── card-search.util.ts                     # new: searchKey, escapeLike, search reducer (alias-free, used by the script)
├── card-entry.util.ts                      # new: canBeCommander, printings, entryFromPrinting, findMatches, validateQuantity
├── card-colors.util.ts                     # new: cardPalette, rolesFromHex
├── card-copy.ts                            # new: CARD strings
└── collection-tree.util.ts                 # + firstLeaf
src/app/core/testing/
└── intersection-observer.ts                # new jsdom helper
src/app/shared/
├── ds/compact-modal/                       # + size input, toast outlet
├── ds/select-list/                         # new
└── cards/                                  # new domain folder
    ├── card-tile/
    ├── card-grid/
    ├── card-view-toggle/
    ├── card-search-modal/
    ├── card-modal/
    ├── duplicate-notice/
    └── moved-notice/
src/app/views/collection-area/
├── collection-area.{ts,html,scss}          # layout v2, grid, aside summary, empty choice live, holding grid
└── card-flow.ts                            # new view-scoped controller
```

Each new or changed unit gets a colocated `.spec.ts`.

**Supabase**: migration `015_cards`, applied with `apply_migration` after user confirmation and checked with `get_advisors`. Then `npm run sync:scryfall`.

**Structure Decision**: the existing single Angular project.
- Card UI goes in a new `shared/cards/` domain folder, the dropdown primitive in `shared/ds/`.
- Pure rules live in `core/utils/`. `card-search.util.ts` stays alias-free so the Node script can import it.
- The flow controller sits next to its only view, like the deck turn controller.

**Docs to update after implementation** (CLAUDE.md test):
- **architecture.md, shared folders**: add `cards/` to the domain subfolder list (structural).
- **architecture.md, "Card catalog"**: the app now queries the catalog through `CardCatalogService` with an anonymous client (`grm-catalog`). The search uses `cards.search_name` (an accent-free key written by `sync:scryfall` via `searchKey`). `printings` also carries `artist` and `faces`. This replaces "The app itself queries no catalog".
- **architecture.md, "Domain model"**: `CardEntry` gains `addedAt` (stamped by `add`, orders lists) and `artist`. `CardService` writes per row through `writeRows` like the other entity services.
- **architecture.md, "Testing"**: `@testing/intersection-observer` for jsdom.
- **architecture.md, "Modals"**: `CompactModal`'s `size` (`compact`/`wide`/`split`) and its toast outlet, and the `SelectList` primitive.

`commands.md` needs nothing: the sync script runs the same way.

## Complexity Tracking

No violations. The `writeRows` per-row variant is spec 008's, already justified, now applied to `CardService`.

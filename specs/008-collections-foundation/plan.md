# Implementation Plan: Collections Foundation

**Branch**: `feature/008-collections-foundation` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-collections-foundation/spec.md`, plus the design handoff in `design_handoff_collections_foundation/`

## Summary

This rebuilds collections from scratch. A new `Collection` entity (name, one of 16 palette colors, parent, `updatedAt`) replaces `StorageLocation`, in a new `collections` IndexedDB store and a new `collections` Supabase table. The old views, shared components, service and table are deleted.

**Storage**:
- Counts, depth and kind (empty, holds cards, holds subcollections) are never stored. A single `computed` pass over the owned cards derives them.
- The holding box is also derived: any card whose `locationId` matches no collection. So "move to the holding box" writes no card at all.
- Deletes and "create the first subcollection and move the cards" run as one IndexedDB transaction across the collections, cards and tombstones stores, writing by key instead of rewriting whole stores.

**Sync**: the existing last-write-wins reconciler, followed by a pure tree repair. The repair removes orphaned subcollections and renames duplicate siblings "Nome (2)".

**CSV import**: the import logic (`CardImportService`, `card-import.util.ts`) is kept for a later spec; only its old screen is removed.

**UI**: one reused view on a single matcher route (`/collection`, `/collection/{id}`, `/collection/caixa`) renders the list, a collection or the holding box, with the handoff's page transition. A new compact modal shell hosts the create/edit and delete dialogs.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular 22 (standalone, zoneless, signals)

**Primary Dependencies**: none new. It uses `idb`, `@supabase/supabase-js`, `_controls.scss`, `_tokens.scss`, the `_ring`/`_face` partials and `ToastService`.

**Storage**:
- **IndexedDB**: the profile DB goes to v2. It adds a `collections` store, deletes `locations`, and the tombstone entity becomes `collections`.
- **Supabase**: a new `collections` table; `storage_locations` and the card FK are dropped. See [data-model.md](data-model.md).

**Testing**: Vitest via `ng test` (jsdom, `fake-indexeddb`, fake timers, a seeded random for the orbs); manual scenarios in [quickstart.md](quickstart.md)

**Target Platform**: browser/PWA (desktop and mobile) and Capacitor Android WebView

**Project Type**: single-project Angular web app

**Performance Goals**:
- The list with correct counts in under 1 s at 50,000 copies over 100 collections (SC-002). The derivation is one linear pass.
- A 5,000-card delete or move in under 3 s (SC-004, SC-009). It's one transaction.

**Constraints**:
- Fully offline, and profile-isolated.
- A collection record is independent of its card count (FR-020).
- A rename writes and sends one row (SC-003).
- Works from 320 px wide; reduced motion is honored.

**Scale/Scope**:
- 1 view (replacing 3), 5 new shared components and 1 new design-system primitive.
- 1 new service, 2 new utils modules and 1 copy file; `SyncService`, `CardService`, `entity-store`, `profile-db` and `ProfileFlowStore` change.
- 1 migration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Physical-World Fidelity | Pass | The core of this feature. The holding box guarantees that every card stays findable. It's derived from dangling references, so no path (delete, sync, interruption) can hide a card (FR-016, research R1). Delete forces an explicit choice (FR-013). |
| II. PT-BR-First | Pass | All copy is PT-BR in `collection-copy.ts` (ui.md §7). Cloud errors go through the existing `mapCloudError`/sync classification. |
| III. Free and Accessible | Pass | No limits or upsells. The reserved placeholders say "em breve", never "premium". |
| IV. Local-First, Cloud-Optional | Pass | A per-profile IndexedDB database. Nothing leaves the device until the person syncs a linked profile (FR-018). The route is gated by `profileGuard`. |
| V. Zoneless, Signal-Driven Angular | Pass | Standalone OnPush components; `computed` for the derived state and `effect` for the redirect; native `<dialog>`; no UI framework. The DESIGN.md additions land before the UI is built (FR-026). |
| VI. Persistence and Sync Pattern | Pass, with one justified variant (below) | `CollectionService` has the full entity shape (`load`/`whenReady`/`flush`, captured-handle write queue, `updatedAt`, tombstones, `applySyncResult`) and joins the profile switch. The sync reuses `reconcileEntities`. The new table ships grants and owner-only RLS in the same migration, with `updated_at not null default now()`. |

**Variant (VI)**: `CollectionService` persists with per-row puts and deletes in a cross-store transaction (`writeRows`), where the other services use `replaceStore`. This is within the pattern, since it's still a serialized queue with a captured handle. It's required by FR-015 (all-or-nothing across collections and cards) and FR-020–FR-022 (anti-bloat). Legacy card mutations keep `replaceStore` until the card spec (FR-024).

**Post-design re-check (after Phase 1)**: still passes. No spec amendment was needed.

## Project Structure

### Documentation (this feature)

```text
specs/008-collections-foundation/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── services.md      # Phase 1: services, utils, routes, components
│   └── supabase.md      # Phase 1: migration 008_collections, client calls
├── ui.md                # Phase 1
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design (Phase 1 → `ui.md`)

[ui.md](ui.md) covers:
- the list, collection and holding-box places, and the empty state;
- the create/edit dialog with the 5/6/5 color picker;
- the delete dialog and the compact modal shell;
- the page transition;
- layout per breakpoint, states mapped to requirements, flow, reuse, accessibility and all PT-BR copy.

The visual source is the hi-fi `design_handoff_collections_foundation/Colecao.dc.html`.

### Source Code (repository root)

```text
DESIGN.md                                            # + palette, Collections components, page transition, copy (FR-026)
src/app/app.routes.ts                                # one matcher route replaces 3 collection routes
src/app/app.scss                                     # main.view-area: scrollbar-gutter: stable
src/app/core/models/
├── collection.model.ts                              # new: Collection, CollectionColorId, COLLECTION_COLORS, CollectionStats
└── storage-location.model.ts                        # deleted
src/app/core/db/
├── profile-db.ts                                    # v2: + collections, − locations; TombstoneEntity
└── entity-store.ts                                  # + writeRows(); store/entity names
src/app/core/services/
├── collection.service.ts                            # new (replaces storage-location.service.ts, deleted)
├── card.service.ts                                  # + applyRemoved/applyMoved; − search
├── card-import.service.ts                           # kept unchanged: CSV import logic for a future spec (research R13)
├── profile-session.service.ts                       # CollectionService in entityServices
└── sync.service.ts                                  # syncCollections + repair + FR-029 fix-up
src/app/core/utils/
├── collection-tree.util.ts                          # new: validation, sort, stats, subtree, repair, suffix
├── collection-transition.util.ts                    # new: transitionDir, makeOrbs
├── collection-copy.ts                               # new: COLLECTION strings, formatCount, plural
├── location-cards.util.ts                           # deleted
├── card-import.util.ts                              # kept unchanged (CSV import)
└── sync-status.util.ts                              # hasUnsyncedChanges: locations → collections
src/app/shared/
├── ds/compact-modal/                                # new: CompactModal (research R10)
├── collections/                                     # new domain folder (replaces locations/, deleted)
│   ├── collection-row/
│   ├── create-row/
│   ├── color-picker/
│   ├── collection-form-dialog/
│   └── collection-delete-dialog/
├── cards/collection-card-grid/                      # deleted
├── common/search-results-list/                      # deleted
├── auth/profile-modal/profile-flow.store.ts         # unsynced check reads CollectionService
└── index.ts                                         # barrel updated
src/app/views/
├── collection-area/                                 # new: view + collection-transition.ts (controller)
└── collection/, collection-detail/, collection-import/   # deleted
```

Each new or changed unit gets a colocated `.spec.ts`. The specs of deleted units go with them. `entity-load-isolation.spec.ts` switches to `CollectionService`.

**Supabase**: migration `008_collections`, applied with `apply_migration` and then checked with `get_advisors`.

**Structure Decision**: the existing single Angular project.
- Collection UI goes in a new `shared/collections/` domain folder, replacing `shared/locations/`, per the architecture.md domain-folder convention.
- The compact modal shell is a design-system primitive in `shared/ds/`.
- The pure logic lives in `core/utils/`.
- The transition controller sits next to its only view.

**Docs to update after implementation** (CLAUDE.md test):
- **architecture.md**:
  - `StorageLocation` → `Collection` in "Domain model";
  - "Sync" (collections, the tree repair, the dangling-reference holding box);
  - the `shared/` domain folders (`collections/` replaces `locations/`);
  - the new `writeRows` per-row persistence variant.
  All are lasting conventions.

## Complexity Tracking

| Variant | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Per-row cross-store transaction (`writeRows`) instead of `replaceStore` | FR-015 needs all-or-nothing across collections and cards; FR-020–FR-022 and SC-004 rule out rewriting 50,000 cards | `replaceStore` per service: two separate transactions (not atomic), and full-store rewrites on every change |

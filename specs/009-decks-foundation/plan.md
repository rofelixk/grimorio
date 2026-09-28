# Implementation Plan: Decks Foundation

**Branch**: `009-decks-foundation` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-decks-foundation/spec.md`, plus the design handoff in `design_handoff_decks_foundation/`

## Summary

This rebuilds decks from scratch as a card location next to collections.

**The record**: a new `Deck` (name, one of 8 format ids, `updatedAt`) replaces the old commander/deck-card record. It lives in a recreated `decks` IndexedDB store (profile DB v3) and a new `decks` Supabase table.

**Cards**: a card in a deck will carry the deck id in its existing `locationId`. The holding box becomes "matches no collection and no deck", so deleting a deck writes no card: its cards dangle into the holding box, all-or-nothing by construction (FR-009).

**Sync**: the existing last-write-wins reconciler, then a duplicate-name rename ("Nome (2)").

**UI**: one reused view on a matcher route (`/decks`, `/decks/{id}`) renders:
- the list of sleeved-card fans with a featured-card placeholder;
- the empty state;
- the header-only deck page;
- the handoff's page turn with dust. The dust is a canvas driven by pure, seeded physics, fading one speck at a time within 2 s. It plays only for the exits the clarification fixed.

The create/edit dialog (with the format picker and rules plate) and the delete dialog reuse spec 008's `CompactModal`. The old deck views, components and model are deleted.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular 22 (standalone, zoneless, signals)

**Primary Dependencies**: none new. It uses `idb`, `@supabase/supabase-js`, `_controls.scss`, `_tokens.scss`, `CompactModal`, `CreateRow` and `ToastService`.

**Storage**:
- **IndexedDB**: the profile DB goes to v3. `decks` is recreated (old records dropped), and tombstones gain the `decks` entity.
- **Supabase**: a new `decks` table. See [data-model.md](data-model.md).

**Testing**: Vitest via `ng test` (jsdom, `fake-indexeddb`, fake timers, a seeded random for the dust); manual scenarios in [quickstart.md](quickstart.md)

**Target Platform**: browser/PWA (desktop and mobile) and Capacitor Android WebView (hardware back = `popstate`)

**Project Type**: single-project Angular web app

**Performance Goals**:
- The list of 200 decks in under 1 s on a mid-range phone (SC-002): `content-visibility: auto` tiles and a transform-only fan.
- The page turn at 60 fps: a compositor-only transform, with a canvas of 260 or 110 pre-rendered sprites.

**Constraints**:
- Fully offline, and profile-isolated.
- A deck record holds no card data or counts (FR-011).
- The dust leaves nothing ≤ 2 s after settle (FR-018).
- Works from 320 px wide; reduced motion is honored.
- Card images are never cropped or altered (FR-017).

**Scale/Scope**:
- 1 view (replacing 2), 5 new shared components and 1 view-scoped controller.
- 1 rewritten service, 3 new utils modules and 1 copy file; `CollectionService`, `SyncService`, `entity-store`, `profile-db`, `sync-status.util`, `ProfileFlowStore`, `AddCardModal` and the nav destinations change.
- 1 migration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Physical-World Fidelity | Pass | A deck is a location in the same `locationId` field, so a card has exactly one place. Deleting a deck can't hide a card: its cards derive into the holding box (R1, FR-009, SC-004). |
| II. PT-BR-First | Pass | All copy is PT-BR in `deck-copy.ts` (ui.md §7), with format names as Brazilian players say them. Cloud errors go through the existing sync classification and `mapCloudError`. |
| III. Free and Accessible | Pass | No limits or upsells. The featured-card placeholder says what's coming, not "premium". |
| IV. Local-First, Cloud-Optional | Pass | A per-profile IndexedDB database; nothing leaves the device until a linked profile syncs (FR-012). The route is gated by `profileGuard`. |
| V. Zoneless, Signal-Driven Angular | Pass | Standalone OnPush components; `computed` for the derived state, `effect` for the redirect and turn trigger; native `<dialog>` through `CompactModal`; no UI framework and no `@angular/animations`. The DESIGN.md additions (the Decks section, the page-turn motion, the radius exception, copy) land before the UI is built (FR-015). |
| VI. Persistence and Sync Pattern | Pass | `DeckService` has the full entity shape (`load`/`whenReady`/`flush`, a captured-handle queue, `updatedAt`, tombstones, `applySyncResult`), with spec 008's accepted `writeRows` per-row variant. The sync reuses `reconcileEntities`. The new table ships grants and owner-only RLS in the same migration, with `updated_at not null default now()`. |

**Post-design re-check (after Phase 1)**: still passes. No spec amendment is needed. The one visual exception (14/12 px radii for the sleeves and card window) is recorded for DESIGN.md, not introduced silently (ui.md §5).

## Project Structure

### Documentation (this feature)

```text
specs/009-decks-foundation/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── services.md      # Phase 1: services, utils, routes, components
│   └── supabase.md      # Phase 1: migration 009_decks, client calls
├── ui.md                # Phase 1
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design (Phase 1 → `ui.md`)

[ui.md](ui.md) covers:
- the list of deck fans, the empty state and the header-only deck page;
- the page turn with dust;
- the create/edit dialog with the 8-format picker and rules plate;
- the delete dialog;
- layout per breakpoint, states mapped to requirements, flow, reuse, accessibility and all PT-BR copy.

The visual source is the hi-fi `design_handoff_decks_foundation/Decks Hi-fi.dc.html`.

### Source Code (repository root)

```text
DESIGN.md                                            # + Decks components, "Decks page turn" motion, radius exception, copy (FR-015)
src/app/app.routes.ts                                # deckMatcher → DeckArea replaces decks + decks/:id
src/app/core/models/
└── deck.model.ts                                    # rewritten: Deck, DeckFormatId, DECK_FORMATS, DEFAULT_FORMAT, formatOf, DeckNameError
src/app/core/db/
├── profile-db.ts                                    # v3: decks recreated; TombstoneEntity + 'decks'
└── entity-store.ts                                  # EntityStoreName/RowOp + 'decks'
src/app/core/services/
├── deck.service.ts                                  # rewritten (research R3)
├── collection.service.ts                            # stats reads DeckService.ids (R1)
├── sync.service.ts                                  # + syncDecks, DeckRow mapping
└── entity-load-isolation.spec.ts                    # uses DeckService.create
src/app/core/utils/
├── deck.util.ts                                     # new: normalize, compare, validate, repairDeckNames
├── deck-turn.util.ts                                # new: DeckPlace, turnFor (R8)
├── deck-dust.util.ts                                # new: specks, edgeX, stepSpeck, settle (R10)
├── deck-copy.ts                                     # new: DECK strings and format rules
├── collection-tree.util.ts                          # computeStats(…, deckIds)
├── sync-status.util.ts                              # hasUnsyncedChanges + decks
└── entry-copy.ts                                    # + SHELL.decks; − DELETE_PROFILE.decksNote
src/app/shared/
├── decks/                                           # rebuilt domain folder (deck-list deleted)
│   ├── deck-tile/
│   ├── deck-fan/
│   ├── format-picker/
│   ├── deck-form-dialog/
│   └── deck-delete-dialog/
├── cards/deck-card-list/, card-picker/, color-identity/   # deleted (R14)
├── cards/add-card-modal/                            # deck context removed; kept for the card spec
├── layout/nav-links/nav-destinations.ts             # + Decks
├── auth/profile-modal/                              # decksNote removed; unsynced check reads decks
└── index.ts                                         # barrel updated
src/app/views/
├── deck-area/                                       # new: view + deck-turn.ts (controller)
└── decks/, deck-detail/                             # deleted
```

Each new or changed unit gets a colocated `.spec.ts`. The specs of deleted units go with them.

**Supabase**: migration `009_decks`, applied with `apply_migration` and then checked with `get_advisors`.

**Structure Decision**: the existing single Angular project.
- Deck UI goes in the `shared/decks/` domain folder (already listed in architecture.md).
- The pure logic lives in `core/utils/`.
- The turn controller sits next to its only view, like `CollectionTransition`.

**Docs to update after implementation** (CLAUDE.md test):
- **architecture.md "Domain model"**: replace the old `Deck`/`DeckCard` entry with the new `Deck` (name, format, `updatedAt`) and "a deck id in `CardEntry.locationId` places a card in a deck; the holding box is cards matching no collection and no deck".
- **architecture.md "Sync"**: decks sync (`decks`, `onConflict: 'user_id,id'`, tombstones, duplicate rename). Remove "Not extended to decks…" and the `DeckCardIdentity` sentence.
- **architecture.md "Routing"**: the deck area is one matcher route (`deckMatcher`) like the collection area.

All three are lasting conventions a future session would otherwise get wrong. Nothing needs to go into `commands.md`.

## Complexity Tracking

No violations. The `writeRows` per-row variant is spec 008's, already justified and reused unchanged.

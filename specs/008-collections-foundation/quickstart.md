# Quickstart: Collections Foundation

**Feature**: `008-collections-foundation`. These are the validation scenarios that prove the feature end to end. Behavior details live in [contracts/services.md](contracts/services.md), [data-model.md](data-model.md) and [ui.md](ui.md).

## Prerequisites

- The migration `008_collections` is applied, and `get_advisors` (security) is clean for `collections` ([contracts/supabase.md](contracts/supabase.md)).
- DESIGN.md holds the collection palette and components (FR-026).
- Unit tests and lint are green (through the `test-runner` agent: `npm test`, `npm run lint`).
- The dev server is running (`npm start`, which the user runs). A profile is active. For step 7, a second browser profile or device is linked to the same cloud account.

To seed cards for counts: this slice adds no way to place cards. Use a test helper or the DevTools console, calling `CardService.addMany` with a `locationId` of an existing collection. Cards with an unknown `locationId` appear in the holding box.

## Automated coverage (unit)

| Area | Spec file | Proves |
|---|---|---|
| Tree utils | `collection-tree.util.spec.ts` | Validation (empty/long/taken, case and spaces), sort order, `defaultColor`, `subtreeIds`, `computeStats` roll-up plus holding (and 50,000 entries within a loose time bound), `repairCollectionTree` (orphans cascade, duplicate rename survivor rule, 40-character cut), `suffixedName` |
| Service | `collection.service.spec.ts` | Create at 3 levels and rejection at 4; create-with-move is one transaction; update never writes cards; `remove` move/delete writes the right rows and tombstones; an interrupted (rejected) transaction leaves IndexedDB unchanged; profile isolation |
| Sync | `sync.service.spec.ts` | Collections round-trip; tombstone delete; orphan removed remotely; duplicate renamed and uploaded; move-delete sends no card rows; FR-029 fix-up after sync |
| Transition | `collection-transition.util.spec.ts` | `transitionDir` for deeper/shallower/sideways; `makeOrbs` count, ranges and direction with a seeded random |
| View and dialogs | `collection-area.spec.ts`, `*-dialog.spec.ts`, `color-picker.spec.ts` | Each state in ui.md §3; redirects; toast texts; focus on `h1`; locked dialog while deleting; keyboard picker |

## Manual scenarios

1. **Empty and create (US1-4, US2)**: open "Coleção" with a new profile.
   - You see the empty state.
   - Create "Fichário vermelho". It has a preselected color, and the row shows "Vazia".
   - Try an empty name, 41 characters, and " fichário VERMELHO ". Each gives its PT-BR error.
2. **Nesting (US3)**: open it and choose "Nova subcoleção" → "Azuis". Inside, create "Raras".
   - "Raras" shows "Nível 3 de 3" and "Último nível — guarda só cartas.", with no create action.
   - The path links go back up. The system back button walks up one level at a time. A reload keeps the page.
3. **Counts (US1-2, FR-007)**: seed 3 entries into "Raras", with quantities 1, 2 and 3, and only the quantity-1 entry for sale.
   - Each ancestor row shows "6 cartas · 1 à venda".
   - The top row shows "2 subcoleções".
4. **Create with move (US3-5, FR-029)**: seed cards directly into a level-1 collection, open it, and choose "Dividir em subcoleções".
   - The form shows the move plate, and the verb reads "Criar e mover cartas".
   - After saving, the parent shows kind subcollections, and the new subcollection holds all the cards.
5. **Delete (US4, US5)**:
   - Delete an empty collection: a plain confirmation, then the toast "{nome} foi excluída.".
   - Delete one with cards: confirm stays disabled until you choose.
     - Choosing "Mover" makes the holding tag appear with the count.
     - Opening it shows the counts.
   - Delete another with "Excluir as cartas": the cards are gone.
   - Delete while standing inside the subtree: you land on its parent.
6. **Addresses (FR-006)**: open `/collection/does-not-exist`, and `/collection/caixa` with an empty holding box. Both redirect to `/collection`.
7. **Sync (US6)**: on device A, create a tree and sync. On device B, sync: the same tree appears. Then:
   - rename on both devices, and the newest edit wins;
   - delete on A, and it disappears on B and never returns;
   - create the same-named sibling on both before syncing, and one becomes "Nome (2)".
8. **Transition**:
   - Drilling down slides left with orbs, going up slides right, and the height changes without a flicker.
   - With reduced motion enabled in the OS, pages swap instantly.
9. **Scale (SC-002, SC-004)**: seed 50,000 copies over 100 collections.
   - The list renders at once.
   - Deleting a collection that holds 5,000 copies finishes in under 3 s, with the app staying responsive.
10. **Narrow screens**: at 320 px, check the dashed create row, the full-bleed dialog with stacked buttons, the stacked choice plates, and the 50/50 actions.

## Post-implementation

Run the `design-auditor` agent over the new UI and fix what it reports (CLAUDE.md).

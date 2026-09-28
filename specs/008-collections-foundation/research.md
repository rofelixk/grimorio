# Research: Collections Foundation

**Feature**: `008-collections-foundation` | **Date**: 2026-09-28

The Technical Context had no open unknowns. Each item below is a design decision that the spec leaves to planning.

## R1. The holding box is a dangling reference, not a stored value

**Decision**: "Move to the holding box" writes nothing to the cards. It deletes the collections, and their cards keep their `locationId`, which now points at no collection. A card is in the holding box when `locationId` doesn't match any collection of the profile (FR-016 already says "or whose collection no longer exists").

**Rationale**:
- Zero card writes, locally and in the cloud. Moving 5,000 cards costs the same as deleting an empty collection (FR-022, SC-004).
- The move is atomic by construction: it's just the collection delete (FR-015).
- Other devices reach the same state from the synced collection delete alone. No card is re-sent.
- Ids are UUIDs and are never reused, so a dangling reference stays dangling.
- If a newer remote edit resurrects the deleted collection (last write wins, spec edge case), its cards come back with it. That's the expected outcome of losing to a newer edit.

**Alternatives considered**:
- A `null` `locationId`: it rewrites and re-uploads every moved card, and it changes the card record, which FR-024 rules out.
- A reserved "holding" id: it has the same write cost, and it's a magic value the card spec would inherit.

## R2. Per-row writes and one cross-store transaction

**Decision**:
- `entity-store.ts` gains `writeRows(ops, handle)`: one IndexedDB `readwrite` transaction over `collections`, `cards` and `tombstones` that applies puts and deletes by key.
- `CollectionService` persists every change through it: create, edit, delete, and create with move.
- It never uses `replaceStore` (which clears the store and rewrites it whole).
- `CardService` gains two sync-free, signal-only methods, `applyRemoved(ids)` and `applyMoved(ids, locationId, updatedAt)`. They let `CollectionService` update the card signal without the card service's own `replaceStore` persist.

**Rationale**:
- `replaceStore` rewrites every row on every change. With 50,000 cards, a delete driven through `CardService.remove()` per card would mean thousands of full rewrites.
- One transaction over all three stores makes a delete or a move all-or-nothing (FR-015). If the app closes before commit, nothing lands, and the next load shows the collection unchanged.

**Ordering**: the collection write queue first awaits `CardService.flush()`, then runs the transaction. A card snapshot queued before the change lands first. Snapshots queued after it already reflect the change, because the signal was updated synchronously. Either way, the last write matches the signal.

**Alternatives considered**:
- Moving `CardService` to per-row writes everywhere: that belongs to the card spec (FR-024), and legacy card mutations keep `replaceStore` until then.
- Two separate writes, collections then cards: an interruption between them breaks FR-015.

## R3. Counts are one linear pass, derived and never stored

**Decision**: one `computed` in `CollectionService`, `stats`, runs over `CardService.cards()` once.
- It builds `direct: Map<collectionId, {entries, cards, sale}>` from `quantity` and `forSale`. Unmatched ids add to `holding`.
- It then rolls the totals up the tree (at most 3 levels, so each card adds to at most 3 totals) and counts all descendants per collection.
- Views read `stats().byId.get(id)`. There's no per-row `computed` over the cards.

**Rationale**:
- 50,000 entries times 3 levels is well under 1 ms of map work per change (SC-002).
- Nothing is stored, so nothing can drift (FR-020).

**Alternatives considered**:
- Stored counters on the collection: they bloat records and break FR-020.
- A `computed` per collection: it scans all cards once per collection.

## R4. The collection's kind is derived

**Decision**: `kind(id)` is `'subcollections'` when the collection has a child, `'cards'` when it has at least one direct card entry, and `'empty'` otherwise. Nothing about the kind is stored (FR-027). The service enforces the rules:
- `create(parentId)` rejects a level-4 parent.
- Creating inside a `'cards'` parent always moves that parent's direct cards (FR-029).
- No API in this slice places cards in a collection. The card spec will check `kind !== 'subcollections'`.

**Rationale**: deriving the kind avoids a second source of truth that sync would have to reconcile. FR-028 (the parent becomes empty when its last subcollection goes) then falls out for free.

## R5. Cloud schema: a new `collections` table; `storage_locations` is dropped

**Decision**: one migration, `008_collections` (contracts/supabase.md):
- It drops `card_entries_location_fkey`, then drops `storage_locations`.
- It creates `collections (user_id, id)` with `name`, `color`, `parent_id` and `updated_at`.
- It ships the grants and owner-only RLS in the same migration.

Checked in the live project on 2026-09-28: both old tables have 0 rows.

- **No `parent_id` foreign key**: sync applies orphan removal itself (R6). An FK would make batch upserts order-sensitive, and a child upserted after its parent's delete would fail the whole sync.
- **No unique-name constraint**: duplicates are resolved client-side by renaming (R6), not rejected mid-sync.
- **A `color` check constraint** over the 16 ids.
- `card_entries.location_id` stays a `uuid not null` with no FK, so holding-box cards (R1) are valid rows. The card record is unchanged (FR-024).

**Alternatives considered**:
- Renaming `storage_locations`: the spec says to replace the old tables rather than extend them (FR-024).
- Keeping the card FK with `on delete set null`: it contradicts R1, and the column is `not null`.

## R6. Sync: reconcile, then repair the tree

**Decision**: `SyncService.syncCollections` runs `reconcileEntities` unchanged, then passes `merged` through a pure `repairCollectionTree(merged, remoteIds, now)` (`core/utils/collection-tree.util.ts`). The repair does two things, in this order:

1. **Orphans (FR-019)**: it drops every collection whose parent isn't in the set, repeating until stable, which is at most 2 rounds at depth 3. The dropped ids join `toDeleteRemoteIds` if the remote has them, and leave `toUpsertRemote`.
2. **Duplicate sibling names (FR-003, FR-019)**: it groups siblings by their normalized name (R12). In each group, one collection keeps its name:
   - Preference goes to a collection that was already on the remote before this sync.
   - Ties break on the lowest `id`, so every device picks the same survivor.
   - Each other member gets the lowest free suffix, "Nome (2)" and up. The base is cut so the whole name is at most 40 characters.
   - The rename is stamped with the current `updatedAt` and added to `toUpsertRemote`.

After `syncCards`, a local, sync-free pass applies FR-029. For any collection that has both children and direct cards, the cards move to its first child in alphabetical order (R12). These are ordinary card edits with fresh `updatedAt`, uploaded on the next sync, as the spec says. This can't happen until the card spec lets cards be placed.

**Rationale**:
- A pure function keeps the trickiest rules unit-testable, like `reconcileEntities`.
- The repair runs before upload, so the cloud never holds an orphan or a duplicate this device can see.
- Two devices can repair the same duplicate differently only when neither has seen the other's collection. The next sync converges, because each rename is an ordinary last-write-wins edit.

**Depth**: parents are immutable in this slice (no move), so sync can't create a fourth level.

## R7. Tombstones follow the existing pattern

**Decision**: every deleted collection and every deleted card gets a tombstone, written in the same transaction as the delete, whether or not the profile is linked. That matches `CardService`/`StorageLocationService` today. Tombstones are cleared by sync as they are now.

**Rationale**: FR-022 allows "what is needed to carry the deletion to the cloud on the next sync". Skipping tombstones for unlinked profiles would resurrect rows if the profile is later linked to an account that has them. That's an edge case not worth a divergent rule.

## R8. One route with a matcher, so the view instance survives navigation

**Decision**: one route, `{ matcher: collectionMatcher, component: CollectionArea, ...gated }`.
- It matches `collection` and `collection/:ref`.
- `ref` is a collection id or the reserved segment `caixa` (UUIDs can't collide with it).
- `withComponentInputBinding` feeds `ref` into the component.

**Rationale**:
- Angular reuses a component only within the same route config. A single config keeps one `CollectionArea` instance across list, collection and holding box, which the out → swap → in transition needs (R9).
- Every place still has its own address, and back, reload and deep links work (FR-006).

**Invalid addresses**: an effect in the view redirects with `replaceUrl` to `/collection` when:
- `ref` names a collection that doesn't exist, or
- `ref` is `caixa` and the holding box is empty.

This covers deep links, deletions from sync, and profile switches (the guard's re-run reloads the same URL).

After a delete from the view, the view records the deleted subtree and its parent when the delete dialog opens. If the routed collection is missing and belongs to that subtree, the redirect effect navigates (with `replaceUrl`) to the parent's address, or to `/collection` for a top-level collection, instead of the list (FR-031). `remove()` updates the signals when it's called, so this redirect fires while the dialog still shows "Excluindo…". Every other missing id goes to `/collection`.

**Alternatives considered**: separate routes per view, which destroy the view and rule out the transition; and a `canActivate` existence guard, which still needs the effect for sync-time deletions.

## R9. Page transition: a view-scoped controller plus a pure orb generator

**Decision**: `collection-transition.ts`, next to the view, holds the phases (`idle | out | in`), `dir`, the locked height and the orb list.
- The view renders `shown`, a lagging copy of the routed `ref`.
- On a route change the controller:
  1. runs "out" for 140 ms;
  2. swaps `shown`;
  3. runs "in" for 240 ms;
  4. animates the height;
  5. releases it after 280 ms.
- `dir` is +1 when the new place is deeper or sideways, and −1 when it's shallower.
- A pure `makeOrbs(count, dir, random)` in `core/utils/collection-transition.util.ts` builds the 13 orb specs, so it's testable with a seeded random.
- Under `prefers-reduced-motion` (read through a `matchMedia` signal, like `media-query.ts`), the controller swaps immediately and emits no orbs.

The orb layer is absolutely positioned inside the view host (`position: relative; overflow: hidden`), which fills `<main>`'s content box. `app.scss` adds `scrollbar-gutter: stable` to `main.view-area`.

**Alternatives considered**: Angular route animations (`@angular/animations`), which the app doesn't use and which need the animations package; and the View Transitions API, which has no height lock and no support in older Android WebViews.

## R10. A compact dialog shell in the design system

**Decision**: a new `CompactModal` (`shared/ds/compact-modal/`).
- It's a native `<dialog>` built from the existing `_ring.scss` and `_face.scss` partials, themed from `IdentityService.roles()`.
- Width is `min(480px, 100vw − 2rem)`, with the halo and no sparks.
- Its close row has ✕. Below 640 px it goes full-bleed, with a header holding the wordmark and ✕.
- Like `ThemedModal`, it opens on mount, closes on destroy and restores focus to the opener.
- A `locked` input blocks Esc, backdrop and ✕ while a delete runs (FR-031).

**Rationale**: `ThemedModal`'s face is the 880 px two-column identity grid, and making it switch layouts would couple two blueprints. The new shell reuses the same partials, as `PlanarPreviewDialog` did.

## R11. The palette is data plus DESIGN.md tokens

**Decision**:
- `core/models/collection.model.ts` exports `COLLECTION_COLORS`: 16 records of `{ id, name, hex, outline? }`, in the handoff's order and rows.
- The ids are ASCII slugs: `branco, azul, violeta, vermelho, verde, carvao, nevoa, anil, vinho, ocre, salvia, cinza, turquesa, rosa, laranja, dourado`.
- Stored and synced values are the ids (spec Key Entities: "stored by its identity").
- DESIGN.md gets the palette in its front matter and a "Collection colors" subsection, with the rule "swatches only, never UI chrome".

**Rationale**: swatch glows need the hex inline (`0 0 0 4px {hex}`), as the identity wheel already does with identity colors. Slugs keep the cloud check constraint readable.

## R12. Name normalization and ordering

**Decision**:
- **Uniqueness** compares `name.trim().toLocaleLowerCase('pt-BR')`: case and surrounding spaces, as FR-003 says. Accents still count, so "Raras" ≠ "Rarás".
- **Ordering** uses `a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })`, which ignores case and accents (FR-008), with `id` as the tiebreak.
- **Length** is counted on the trimmed string's length, 1–40.

## R13. Legacy removal

**Decision**: delete the old collection code and its now-unused dependencies:
- **Views**: `views/collection`, `collection-detail`, `collection-import`.
- **Shared**: `shared/locations/*`, `collection-card-grid`, `search-results-list`.
- **Services and utils**: `StorageLocationService` and its model, `location-cards.util`.
- **Card service**: `CardService.search`, whose only caller was the old collection view.

`add-card-modal` and the card-search components stay, because `deck-detail` still uses them.

**CSV import logic is kept** for a future spec: `CardImportService` (papaparse parsing, printing lookup, match/merge) and `card-import.util.ts` stay in place, unchanged. Neither depends on locations: `import(matched, locationId)` takes a plain id, which will be a collection id. Only the `collection-import` view, which is UI glue, is deleted. The unused service stays out of the bundle through tree-shaking.

The profile DB goes to version 2. The upgrade creates any missing store, adds `collections`, and deletes the `locations` store. There's no data migration: the app is unreleased (spec Assumptions).

The profile modal's unsynced-changes check reads `CollectionService` instead.

## R14. Copy and number formatting

**Decision**:
- All strings live in `core/utils/collection-copy.ts` (`COLLECTION`), verbatim from the handoff, like `planechase-copy.ts`.
- Counts go through one `Intl.NumberFormat('pt-BR')`, and a `plural(n, one, many)` helper gives "1 carta" / "1.240 cartas".

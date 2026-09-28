# Contract: Services, utils and routes

**Feature**: `008-collections-foundation`. These are the TypeScript surfaces other code relies on. Signatures are indicative. Behavior is normative.

## `CollectionService` (`core/services/collection.service.ts`, new)

It follows the entity-service shape (Constitution VI) and joins `ProfileSessionService.entityServices`, replacing `StorageLocationService`.

```ts
load(profileId: string | null): Promise<void>    // clears the signal synchronously, then hydrates
whenReady(): Promise<void>
flush(): Promise<void>
readonly changeCount: Signal<number>             // bumped by user mutations only

readonly collections: Signal<Collection[]>
readonly byId: Signal<Map<string, Collection>>
readonly childrenOf: Signal<Map<string | null, Collection[]>>   // sorted (research R12)
readonly stats: Signal<CollectionStats>                          // research R3, reads CardService.cards()
depth(id: string): number                        // 1..3; 0 if unknown
path(id: string): Collection[]                   // root → id
kind(id: string): 'empty' | 'cards' | 'subcollections'
defaultColor(parentId: string | null): CollectionColorId          // FR-005

create(input: { parentId: string | null; name: string; color: CollectionColorId }):
  { ok: true; collection: Collection; moved: number } | { ok: false; error: NameError | 'too-deep' | 'no-parent' }
update(id: string, patch: { name?: string; color?: CollectionColorId }):
  { ok: true } | { ok: false; error: NameError | 'not-found' }
remove(id: string, choice: 'move' | 'delete'): Promise<{ collections: number; cards: number }>

getTombstones(): Promise<Tombstone[]>            // sync-only
clearTombstones(ids: string[]): Promise<void>    // sync-only
applySyncResult(merged: Collection[]): void      // sync-only: sets the signal and writes by diff, no restamping
```

**Behavior**
- `create`:
  - trims the name and validates it against the future siblings;
  - rejects a parent at depth 3 (`'too-deep'`) or a missing one (`'no-parent'`);
  - stamps `id` and `updatedAt`.
  - If the parent's kind is `'cards'`, it moves every direct card of the parent to the new id in the **same** `writeRows` transaction (FR-029, FR-015). `moved` is the number of copies moved.
- `update` validates only a changed name. It never touches a card (FR-011, FR-021).
- `remove`:
  - collects `subtreeIds(id)`, then updates the collection signal and, for `'delete'`, `CardService.applyRemoved(cardIds)`;
  - enqueues one `writeRows` transaction with the collection deletes, the card deletes (`'delete'` only) and all their tombstones;
  - resolves once the transaction commits, so the dialog shows "Excluindo…" until then (FR-031).
  - With `'move'`, cards are untouched (research R1). The returned counts feed the toast.
- The write queue awaits `CardService.flush()` before each transaction (research R2).

## `CardService` additions (`core/services/card.service.ts`)

```ts
applyRemoved(ids: ReadonlySet<string>): void                              // signal only; persisted by the caller's transaction
applyMoved(ids: ReadonlySet<string>, locationId: string, updatedAt: string): void   // signal only
```

Neither method bumps `changeCount` or persists. Only `CollectionService` calls them, together with its own `writeRows`. `search()` is removed (research R13).

## `entity-store.ts` additions

```ts
type RowOp =
  | { store: 'collections' | 'cards'; put: Collection | CardEntry }
  | { store: 'collections' | 'cards'; delete: string }
  | { store: 'tombstones'; put: TombstoneRecord };
writeRows(ops: RowOp[], handle?: DbHandle): Promise<void>   // one readwrite tx over the touched stores; rejects with no handle
```

`EntityStoreName` gains `'collections'` and loses `'locations'`. `TombstoneEntity` becomes `'cards' | 'collections'`.

## Pure utils

`core/utils/collection-tree.util.ts`:

```ts
normalizeName(name: string): string                                   // trim + toLocaleLowerCase('pt-BR')
compareByName(a: Collection, b: Collection): number                   // localeCompare pt-BR, base; then id
validateCollectionName(name: string, siblings: Collection[], selfId?: string): NameError | null
defaultColor(siblings: Collection[]): CollectionColorId
subtreeIds(id: string, childrenOf: Map<string | null, Collection[]>): string[]
computeStats(collections: Collection[], cards: Pick<CardEntry, 'locationId' | 'quantity' | 'forSale'>[]): CollectionStats
repairCollectionTree(merged: Collection[], remoteIds: ReadonlySet<string>, now: string):
  { collections: Collection[]; removedIds: string[]; renamed: Collection[] }   // research R6
suffixedName(base: string, n: number): string                         // "Nome (n)", base cut to fit 40
```

`core/utils/collection-transition.util.ts`:

```ts
transitionDir(from: Place, to: Place, depthOf: (id: string) => number): 1 | -1
makeOrbs(count: number, dir: 1 | -1, random: () => number): Orb[]    // sizes, positions, dx/dy, duration, delay, role index
```

`core/utils/collection-copy.ts`: `COLLECTION`, all PT-BR strings (ui.md §7), plus `formatCount(n)` and `plural(n, one, many)`.

## `SyncService` changes

- `syncLocations` becomes `syncCollections`: `collections` table, `reconcileEntities`, then `repairCollectionTree`.
  - `removedIds` join the remote delete set (when the remote has them) and leave the upserts.
  - `renamed` join the upserts.
  - Then `CollectionService.applySyncResult` and tombstone clearing.
- Order: identity → collections → cards → FR-029 local fix-up → planar selection. `lastSyncedAt` is captured after the card sync and before the FR-029 fix-up.
- The FR-029 fix-up goes through `CollectionService` (`resolveMixedCollections()`, internal): any collection with children and direct cards moves those cards to its first child by name, as a card edit with a fresh `updatedAt`, in one `writeRows`.

## `ProfileFlowStore` (profile modal)

The unsynced-changes check reads `CollectionService.collections()` and its tombstones in place of the locations. In the input of `hasUnsyncedChanges` (`sync-status.util.ts`), `locations` is renamed to `collections`.

## Routes (`app.routes.ts`)

```ts
{ matcher: collectionMatcher, component: CollectionArea, ...gated }
```

- `collectionMatcher` matches `collection` → `{}` and `collection/:ref` → `{ ref }`.
- `ref` is a collection id or `HOLDING_REF = 'caixa'`.
- The old `collection`, `collection/import` and `collection/:id` routes are removed.
- The nav destination `/collection` is unchanged.

**Addresses (FR-006)**:

| URL | Place |
|---|---|
| `/collection` | the list |
| `/collection/{id}` | a collection (any level) |
| `/collection/caixa` | the holding box |

An unknown id, or `caixa` while the holding box is empty, is replaced by `/collection` (research R8).

## Components

| Selector | Folder | Inputs → outputs |
|---|---|---|
| `app-collection-area` (view) | `views/collection-area/` | `ref?: string` (route) |
| `app-collection-row` | `shared/collections/collection-row/` | `collection`, `totals` → `open` |
| `app-create-row` | `shared/collections/create-row/` | `label`, `sub?` → `activate` |
| `app-collection-form-dialog` | `shared/collections/collection-form-dialog/` | `mode: 'create' \| 'edit'`, `parentId`, `collectionId?` → `closed`, `saved(collection)` |
| `app-collection-delete-dialog` | `shared/collections/collection-delete-dialog/` | `collectionId` → `closed`, `deleted({ parentId, name, choice, result })` |
| `app-color-picker` | `shared/collections/color-picker/` | `value` → `valueChange` |
| `app-compact-modal` | `shared/ds/compact-modal/` | `roles`, `labelledBy`, `locked` → `closed` |

`shared/collections/` is a new domain folder, replacing `shared/locations/`.

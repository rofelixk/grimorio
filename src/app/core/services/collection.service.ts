import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import {
  Collection,
  CollectionColorHex,
  CollectionKind,
  CollectionStats,
  MAX_DEPTH,
  NameError,
} from '@models/collection.model';
import { Tombstone } from '@models/tombstone.model';
import {
  buildChildrenOf,
  computeStats,
  defaultColor as defaultColorFor,
  depthOf,
  subtreeIds,
  validateCollectionName,
} from '../utils/collection-tree.util';
import { TombstoneEntity, TombstoneRecord } from '../db/profile-db';
import {
  RowOp,
  clearTombstones,
  currentDbHandle,
  getAllFromStore,
  getTombstonesFor,
  setActiveProfileDb,
  writeRows,
} from '../db/entity-store';
import { CardService } from './card.service';
import { DeckService } from './deck.service';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly cards = inject(CardService);
  private readonly decks = inject(DeckService);

  private readonly collectionsSignal = signal<Collection[]>([]);
  readonly collections: Signal<Collection[]> = this.collectionsSignal.asReadonly();

  readonly byId: Signal<Map<string, Collection>> = computed(
    () => new Map(this.collections().map((collection) => [collection.id, collection])),
  );

  // Sorted per collection (research R12): consumers never re-sort.
  readonly childrenOf: Signal<Map<string | null, Collection[]>> = computed(() => buildChildrenOf(this.collections()));

  // Reads CardService.cards() (research R3): rolls up whenever either the tree or the cards change.
  // Cards in a deck are skipped, so the holding box is "no collection and no deck" (spec 009 R1).
  readonly stats: Signal<CollectionStats> = computed(() =>
    computeStats(this.collections(), this.cards.cards(), this.decks.ids()),
  );

  private readonly changeCountSignal = signal(0);
  // Bumped by user mutations (create/update/remove), never by applySyncResult — feeds
  // the automatic-sync debounce (R11).
  readonly changeCount = this.changeCountSignal.asReadonly();

  private readyPromise: Promise<void> = Promise.resolve();
  private loadGeneration = 0;
  private writeQueue: Promise<unknown> = Promise.resolve();

  // Points this service at a profile's database (or none) and rehydrates (R1). The signal
  // is cleared synchronously, before anything awaits, so no other profile's rows are ever
  // visible; pending writes still land in the database they were queued for.
  load(profileId: string | null): Promise<void> {
    const generation = ++this.loadGeneration;
    this.collectionsSignal.set([]);
    this.readyPromise = (async () => {
      await this.flush();
      await setActiveProfileDb(profileId);
      const collections = await getAllFromStore<Collection>('collections');
      if (generation === this.loadGeneration) {
        this.collectionsSignal.set(collections);
      }
    })();
    return this.readyPromise;
  }

  // Resolves once the latest load() has landed in the signal.
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  // Resolves once every write enqueued so far has landed in IndexedDB.
  flush(): Promise<void> {
    return this.writeQueue.then(() => undefined);
  }

  // Awaits CardService.flush() first (research R2): a card write CollectionService just made
  // through applyRemoved/applyMoved must never race CardService's own persist queue.
  private enqueueWrite(fn: () => Promise<unknown>): void {
    this.writeQueue = this.writeQueue
      .then(() => this.cards.flush())
      .then(fn)
      .catch((e) => console.error('Grimorio: failed to persist collections.', e));
  }

  depth(id: string): number {
    return depthOf(id, this.byId());
  }

  /** Root → id (empty when `id` isn't in `byId`). */
  path(id: string): Collection[] {
    const byId = this.byId();
    const current = byId.get(id);
    if (!current) {
      return [];
    }
    const chain: Collection[] = [];
    let node: Collection | undefined = current;
    while (node) {
      chain.unshift(node);
      node = node.parentId !== null ? byId.get(node.parentId) : undefined;
    }
    return chain;
  }

  kind(id: string): CollectionKind {
    if ((this.childrenOf().get(id) ?? []).length > 0) {
      return 'subcollections';
    }
    const totals = this.stats().byId.get(id);
    return totals && totals.directEntries > 0 ? 'cards' : 'empty';
  }

  defaultColor(parentId: string | null): CollectionColorHex {
    return defaultColorFor(this.childrenOf().get(parentId) ?? []);
  }

  /**
   * Creates a collection (FR-001, FR-002). A subcollection of a `'cards'` parent takes all of the
   * parent's direct cards with it (FR-029), in the same transaction as the new row (FR-015).
   */
  create(input: {
    parentId: string | null;
    name: string;
    color: CollectionColorHex;
  }): { ok: true; collection: Collection; moved: number } | { ok: false; error: NameError | 'too-deep' | 'no-parent' } {
    const { parentId, color } = input;
    if (parentId !== null) {
      if (!this.byId().has(parentId)) return { ok: false, error: 'no-parent' };
      if (this.depth(parentId) >= MAX_DEPTH) return { ok: false, error: 'too-deep' };
    }
    const error = validateCollectionName(input.name, this.childrenOf().get(parentId) ?? []);
    if (error) return { ok: false, error };

    const now = new Date().toISOString();
    const collection: Collection = { id: crypto.randomUUID(), name: input.name.trim(), color, parentId, updatedAt: now };
    const ops: RowOp[] = [{ store: 'collections', put: collection }];

    let moved = 0;
    if (parentId !== null && this.kind(parentId) === 'cards') {
      const direct = this.cards.cards().filter((card) => card.locationId === parentId);
      for (const card of direct) {
        moved += card.quantity;
        ops.push({ store: 'cards', put: { ...card, locationId: collection.id, updatedAt: now } });
      }
      this.cards.applyMoved(new Set(direct.map((card) => card.id)), collection.id, now);
    }

    this.collectionsSignal.update((collections) => [...collections, collection]);
    this.changeCountSignal.update((n) => n + 1);
    const handle = currentDbHandle();
    this.enqueueWrite(() => writeRows(ops, handle));
    return { ok: true, collection, moved };
  }

  /** Renames and/or recolors one collection; writes that one row and never a card (FR-011, FR-021). */
  update(
    id: string,
    patch: { name?: string; color?: CollectionColorHex },
  ): { ok: true } | { ok: false; error: NameError | 'not-found' } {
    const current = this.byId().get(id);
    if (!current) return { ok: false, error: 'not-found' };

    let name = current.name;
    if (patch.name !== undefined && patch.name.trim() !== current.name) {
      const error = validateCollectionName(patch.name, this.childrenOf().get(current.parentId) ?? [], id);
      if (error) return { ok: false, error };
      name = patch.name.trim();
    }

    const updated: Collection = { ...current, name, color: patch.color ?? current.color, updatedAt: new Date().toISOString() };
    this.collectionsSignal.update((collections) => collections.map((c) => (c.id === id ? updated : c)));
    this.changeCountSignal.update((n) => n + 1);
    const handle = currentDbHandle();
    this.enqueueWrite(() => writeRows([{ store: 'collections', put: updated }], handle));
    return { ok: true };
  }

  /**
   * Deletes a collection and its whole subtree (FR-012–FR-015, FR-022). `'move'` writes no card:
   * the cards' references dangle, which puts them in the holding box (research R1). `'delete'`
   * removes them too. One transaction, tombstones included; the promise settles when it commits,
   * with the counts for the toast (copies, not entries).
   */
  remove(id: string, choice: 'move' | 'delete'): Promise<{ collections: number; cards: number }> {
    if (!this.byId().has(id)) {
      return Promise.resolve({ collections: 0, cards: 0 });
    }
    const ids = new Set(subtreeIds(id, this.childrenOf()));
    const affected = this.cards.cards().filter((card) => ids.has(card.locationId));
    const result = { collections: ids.size, cards: affected.reduce((sum, card) => sum + card.quantity, 0) };

    const deletedAt = new Date().toISOString();
    const ops: RowOp[] = [];
    for (const collectionId of ids) {
      ops.push({ store: 'collections', delete: collectionId });
      ops.push({ store: 'tombstones', put: tombstone('collections', collectionId, deletedAt) });
    }
    if (choice === 'delete') {
      for (const card of affected) {
        ops.push({ store: 'cards', delete: card.id });
        ops.push({ store: 'tombstones', put: tombstone('cards', card.id, deletedAt) });
      }
      this.cards.applyRemoved(new Set(affected.map((card) => card.id)));
    }

    this.collectionsSignal.update((collections) => collections.filter((c) => !ids.has(c.id)));
    this.changeCountSignal.update((n) => n + 1);
    const handle = currentDbHandle();
    return new Promise((resolve, reject) => {
      this.enqueueWrite(() =>
        writeRows(ops, handle).then(
          () => resolve(result),
          (e: unknown) => {
            reject(e);
            throw e;
          },
        ),
      );
    });
  }

  // Sync-only: tombstones let SyncService tell a locally-deleted id apart
  // from one that simply never existed on this device, so a pull doesn't
  // resurrect something this device deliberately removed.
  getTombstones(): Promise<Tombstone[]> {
    return getTombstonesFor('collections');
  }

  clearTombstones(ids: string[]): Promise<void> {
    return clearTombstones('collections', ids);
  }

  // Sync-only (FR-029, research R6): for every collection that ended up with both a child and
  // direct card entries — e.g. a remote rename turned a `'cards'` collection into the parent of a
  // newly-synced sibling — moves those entries to its first child (compareByName order) as
  // ordinary card edits with a fresh updatedAt, in one writeRows transaction. Not a user mutation:
  // it never bumps changeCount. Called by SyncService after syncCards and before
  // syncPlanarSelection, with lastSyncedAt captured just before it. The moved cards are stamped
  // strictly after `syncedAt` (it can share its millisecond), so they're newer than the last sync
  // and get carried on the next one (FR-029).
  resolveMixedCollections(syncedAt: string): void {
    const childrenOf = this.childrenOf();
    const stats = this.stats();
    const cards = this.cards.cards();
    const now = new Date(Math.max(Date.now(), Date.parse(syncedAt) + 1)).toISOString();
    const ops: RowOp[] = [];

    for (const collection of this.collections()) {
      const children = childrenOf.get(collection.id) ?? [];
      const totals = stats.byId.get(collection.id);
      if (children.length === 0 || !totals || totals.directEntries === 0) {
        continue;
      }

      const firstChild = children[0];
      const moved = cards.filter((card) => card.locationId === collection.id);
      if (moved.length === 0) {
        continue;
      }

      this.cards.applyMoved(new Set(moved.map((card) => card.id)), firstChild.id, now);
      for (const card of moved) {
        ops.push({ store: 'cards', put: { ...card, locationId: firstChild.id, updatedAt: now } });
      }
    }

    if (ops.length > 0) {
      const handle = currentDbHandle();
      this.enqueueWrite(() => writeRows(ops, handle));
    }
  }

  // Sync-only: applies an already-reconciled result verbatim — no id generation, no updatedAt
  // restamping, no tombstoning — since SyncService has already decided the merged local state.
  // Writes only the diff: a put for each row whose value changed, a delete for each id gone.
  applySyncResult(merged: Collection[]): void {
    const before = this.byId();
    const mergedIds = new Set(merged.map((collection) => collection.id));
    const ops: RowOp[] = [];
    for (const collection of merged) {
      if (before.get(collection.id) !== collection && !sameCollection(before.get(collection.id), collection)) {
        ops.push({ store: 'collections', put: collection });
      }
    }
    for (const id of before.keys()) {
      if (!mergedIds.has(id)) {
        ops.push({ store: 'collections', delete: id });
      }
    }
    this.collectionsSignal.set(merged);
    if (ops.length > 0) {
      const handle = currentDbHandle();
      this.enqueueWrite(() => writeRows(ops, handle));
    }
  }
}

function tombstone(entity: TombstoneEntity, id: string, deletedAt: string): TombstoneRecord {
  return { key: `${entity}:${id}`, entity, id, deletedAt };
}

function sameCollection(a: Collection | undefined, b: Collection): boolean {
  return (
    !!a &&
    a.name === b.name &&
    a.color === b.color &&
    a.parentId === b.parentId &&
    a.updatedAt === b.updatedAt
  );
}

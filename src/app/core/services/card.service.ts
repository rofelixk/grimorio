import { Injectable, computed, inject, signal } from '@angular/core';
import { CardEntry } from '@models/card.model';
import { Tombstone } from '@models/tombstone.model';
import {
  boundProfileId,
  clearTombstones,
  currentDbHandle,
  getAllFromStore,
  getTombstonesFor,
  replaceStore,
  setActiveProfileDb,
  writeRows,
  type RowOp,
} from '../db/entity-store';
import { CrossTabService } from './cross-tab.service';
import { SaveQueueService } from './save-queue.service';

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly cardsSignal = signal<CardEntry[]>([]);
  readonly cards = this.cardsSignal.asReadonly();

  private readonly changeCountSignal = signal(0);
  // Bumped by user mutations (add/update/mergeInto), never by applySyncResult — feeds
  // the automatic-sync debounce (R11).
  readonly changeCount = this.changeCountSignal.asReadonly();

  // Every card by its location (a collection or deck id), each list newest-added first (R8).
  // One pass, so a page reads its cards without scanning the whole profile.
  readonly byLocation = computed<ReadonlyMap<string, readonly CardEntry[]>>(() => {
    const map = new Map<string, CardEntry[]>();
    for (const card of this.cardsSignal()) {
      const list = map.get(card.locationId);
      if (list) {
        list.push(card);
      } else {
        map.set(card.locationId, [card]);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.id.localeCompare(b.id));
    }
    return map;
  });

  private readyPromise: Promise<void> = Promise.resolve();
  private loadGeneration = 0;
  // Serializes IndexedDB writes so out-of-order async completions can never
  // leave stale data, and gives tests/callers a durability checkpoint.
  private readonly queue = inject(SaveQueueService).create('cards');
  private readonly crossTab = inject(CrossTabService);

  constructor() {
    this.crossTab.on('cards', () => this.refresh());
  }

  // Points this service at a profile's database (or none) and rehydrates (R1). The signal
  // is cleared synchronously, before anything awaits, so no other profile's rows are ever
  // visible; pending writes still land in the database they were queued for.
  load(profileId: string | null): Promise<void> {
    const generation = ++this.loadGeneration;
    this.cardsSignal.set([]);
    this.readyPromise = (async () => {
      await this.flush();
      await setActiveProfileDb(profileId);
      const cards = await getAllFromStore<CardEntry>('cards');
      if (generation === this.loadGeneration) {
        this.cardsSignal.set(cards);
      }
    })();
    return this.readyPromise;
  }

  // Resolves once the latest load() has landed in the signal.
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  // Re-reads the bound profile's cards after another copy saved them (research R5). Never clears
  // the signal first, never bumps changeCount and never writes; loses to a newer load(), and reads
  // again if a change made here lands meanwhile, so it never overwrites it.
  async refresh(): Promise<void> {
    const generation = this.loadGeneration;
    const before = this.cardsSignal();
    const handle = currentDbHandle();
    await this.flush();
    const cards = await getAllFromStore<CardEntry>('cards', handle);
    if (generation !== this.loadGeneration) {
      return;
    }
    if (this.cardsSignal() !== before) {
      return this.refresh();
    }
    this.cardsSignal.set(cards);
  }

  // Resolves once every write enqueued so far has landed in IndexedDB.
  flush(): Promise<void> {
    return this.queue.flush();
  }

  private persist(cards: CardEntry[]): void {
    const handle = currentDbHandle();
    const profileId = boundProfileId();
    this.queue.enqueue(
      () => replaceStore('cards', cards, handle),
      () => this.crossTab.announce('cards', profileId),
    );
  }

  // Queues one per-row transaction with the profile it targets, announcing 'cards' once it lands.
  private save(ops: RowOp[]): void {
    const handle = currentDbHandle();
    const profileId = boundProfileId();
    this.queue.enqueue(
      () => writeRows(ops, handle),
      () => this.crossTab.announce('cards', profileId),
    );
  }

  // Stamps id, updatedAt and addedAt (one instant): callers never pass them (FR-020/FR-021).
  add(card: Omit<CardEntry, 'id' | 'updatedAt' | 'addedAt'>): CardEntry {
    const now = new Date().toISOString();
    const entry: CardEntry = { ...card, id: crypto.randomUUID(), addedAt: now, updatedAt: now };
    this.cardsSignal.update((cards) => [...cards, entry]);
    this.save([{ store: 'cards', put: entry }]);
    this.changeCountSignal.update((n) => n + 1);
    return entry;
  }

  // Edits a row in place: restamps updatedAt, never addedAt, and never moves it.
  update(id: string, patch: Partial<Omit<CardEntry, 'id' | 'addedAt' | 'updatedAt' | 'locationId'>>): void {
    const current = this.cardsSignal().find((card) => card.id === id);
    if (!current) {
      return;
    }
    const updated: CardEntry = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.cardsSignal.update((cards) => cards.map((card) => (card.id === id ? updated : card)));
    this.save([{ store: 'cards', put: updated }]);
    this.changeCountSignal.update((n) => n + 1);
  }

  // Adds `addQuantity` to the target row (FR-015). With `removeId`, that row is deleted in the same
  // transaction and tombstoned (the edit merge, FR-019). `addedAt` is never touched.
  mergeInto(targetId: string, addQuantity: number, removeId?: string): void {
    const target = this.cardsSignal().find((card) => card.id === targetId);
    if (!target) {
      return;
    }
    const now = new Date().toISOString();
    const merged: CardEntry = { ...target, quantity: target.quantity + addQuantity, updatedAt: now };
    const ops: RowOp[] = [{ store: 'cards', put: merged }];
    if (removeId !== undefined) {
      ops.push(
        { store: 'cards', delete: removeId },
        { store: 'tombstones', put: { key: `cards:${removeId}`, entity: 'cards', id: removeId, deletedAt: now } },
      );
    }
    this.cardsSignal.update((cards) =>
      cards.filter((card) => card.id !== removeId).map((card) => (card.id === targetId ? merged : card)),
    );
    this.save(ops);
    this.changeCountSignal.update((n) => n + 1);
  }

  // Signal-only, no persist, no changeCount bump: CollectionService calls these together
  // with its own writeRows transaction (research R2), so a delete or a move stays
  // all-or-nothing without CardService's own replaceStore rewriting the whole store.
  applyRemoved(ids: ReadonlySet<string>): void {
    this.cardsSignal.update((cards) => cards.filter((card) => !ids.has(card.id)));
  }

  applyMoved(ids: ReadonlySet<string>, locationId: string, updatedAt: string): void {
    this.cardsSignal.update((cards) =>
      cards.map((card) => (ids.has(card.id) ? { ...card, locationId, updatedAt } : card)),
    );
  }

  // Sync-only: tombstones let SyncService tell a locally-deleted id apart
  // from one that simply never existed on this device, so a pull doesn't
  // resurrect something this device deliberately removed.
  getTombstones(): Promise<Tombstone[]> {
    return getTombstonesFor('cards');
  }

  clearTombstones(ids: string[]): Promise<void> {
    return clearTombstones('cards', ids);
  }

  // Sync-only: applies an already-reconciled result verbatim — no id
  // generation, no updatedAt restamping, no tombstone side effects — since
  // SyncService has already decided what the merged local state should be.
  applySyncResult(merged: CardEntry[]): void {
    this.cardsSignal.set(merged);
    this.persist(merged);
  }
}

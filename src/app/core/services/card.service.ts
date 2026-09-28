import { Injectable, computed, signal } from '@angular/core';
import { CardEntry } from '@models/card.model';
import { Tombstone } from '@models/tombstone.model';
import {
  clearTombstones,
  currentDbHandle,
  getAllFromStore,
  getTombstonesFor,
  putTombstone,
  replaceStore,
  setActiveProfileDb,
} from '../db/entity-store';

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly cardsSignal = signal<CardEntry[]>([]);
  readonly cards = this.cardsSignal.asReadonly();

  private readonly changeCountSignal = signal(0);
  // Bumped by user mutations (add/addMany/update/remove), never by applySyncResult — feeds
  // the automatic-sync debounce (R11).
  readonly changeCount = this.changeCountSignal.asReadonly();

  private readyPromise: Promise<void> = Promise.resolve();
  private loadGeneration = 0;
  // Serializes IndexedDB writes so out-of-order async completions can never
  // leave stale data, and gives tests/callers a durability checkpoint.
  private writeQueue: Promise<unknown> = Promise.resolve();

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

  // Resolves once every write enqueued so far has landed in IndexedDB.
  flush(): Promise<void> {
    return this.writeQueue.then(() => undefined);
  }

  private enqueueWrite(fn: () => Promise<unknown>): void {
    this.writeQueue = this.writeQueue.then(fn).catch((e) => console.error('Grimorio: failed to persist cards.', e));
  }

  private persist(cards: CardEntry[]): void {
    const handle = currentDbHandle();
    this.enqueueWrite(() => replaceStore('cards', cards, handle));
  }

  add(card: Omit<CardEntry, 'id' | 'updatedAt'>): CardEntry {
    const entry: CardEntry = { ...card, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
    this.cardsSignal.update((cards) => {
      const next = [...cards, entry];
      this.persist(next);
      return next;
    });
    this.changeCountSignal.update((n) => n + 1);
    return entry;
  }

  addMany(cards: Omit<CardEntry, 'id' | 'updatedAt'>[]): CardEntry[] {
    const now = new Date().toISOString();
    const entries = cards.map((card) => ({ ...card, id: crypto.randomUUID(), updatedAt: now }));
    this.cardsSignal.update((existing) => {
      const next = [...existing, ...entries];
      this.persist(next);
      return next;
    });
    this.changeCountSignal.update((n) => n + 1);
    return entries;
  }

  update(id: string, patch: Partial<CardEntry>): void {
    this.cardsSignal.update((cards) => {
      const next = cards.map((card) =>
        card.id === id ? { ...card, ...patch, updatedAt: new Date().toISOString() } : card,
      );
      this.persist(next);
      return next;
    });
    this.changeCountSignal.update((n) => n + 1);
  }

  remove(id: string): void {
    this.cardsSignal.update((cards) => {
      const next = cards.filter((card) => card.id !== id);
      this.persist(next);
      return next;
    });
    this.addTombstone(id);
    this.changeCountSignal.update((n) => n + 1);
  }

  byId(id: string) {
    return computed(() => this.cards().find((card) => card.id === id));
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

  private addTombstone(id: string): void {
    const handle = currentDbHandle();
    this.enqueueWrite(() => putTombstone('cards', { id, deletedAt: new Date().toISOString() }, handle));
  }
}

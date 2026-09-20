import { Injectable, computed, signal } from '@angular/core';
import { CardEntry } from '@models/card.model';
import { Tombstone } from '@models/tombstone.model';
import { matchesCardQuery } from '../utils/text-search.util';
import { clearTombstones, getAllFromStore, getTombstonesFor, putTombstone, replaceStore } from '../db/entity-store';

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly cardsSignal = signal<CardEntry[]>([]);
  readonly cards = this.cardsSignal.asReadonly();

  private readonly readyPromise: Promise<void>;
  // Serializes IndexedDB writes so out-of-order async completions can never
  // leave stale data, and gives tests/callers a durability checkpoint.
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.readyPromise = this.hydrate();
  }

  private async hydrate(): Promise<void> {
    const cards = await getAllFromStore<CardEntry>('cards');
    this.cardsSignal.set(cards);
  }

  // Resolves once this service's initial IndexedDB read has landed in the signal.
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
    this.enqueueWrite(() => replaceStore('cards', cards));
  }

  add(card: Omit<CardEntry, 'id' | 'updatedAt'>): CardEntry {
    const entry: CardEntry = { ...card, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
    this.cardsSignal.update((cards) => {
      const next = [...cards, entry];
      this.persist(next);
      return next;
    });
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
  }

  remove(id: string): void {
    this.cardsSignal.update((cards) => {
      const next = cards.filter((card) => card.id !== id);
      this.persist(next);
      return next;
    });
    this.addTombstone(id);
  }

  byId(id: string) {
    return computed(() => this.cards().find((card) => card.id === id));
  }

  // Collection-wide search by name/set/collector number, used by the
  // /collection root view's search bar — under 3 characters returns no
  // matches rather than the whole collection.
  search(query: string): CardEntry[] {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      return [];
    }
    return this.cards().filter((card) => matchesCardQuery(card, trimmed));
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
    this.enqueueWrite(() => putTombstone('cards', { id, deletedAt: new Date().toISOString() }));
  }
}

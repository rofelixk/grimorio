import { Injectable, computed, signal } from '@angular/core';
import { CardEntry } from '@models/card.model';
import { Tombstone } from '@models/tombstone.model';
import { matchesCardQuery } from '../utils/text-search.util';

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly storageKey = 'grimorio.cards';
  private readonly tombstonesKey = 'grimorio.cards.tombstones';
  private readonly cardsSignal = signal<CardEntry[]>(this.load());
  readonly cards = this.cardsSignal.asReadonly();

  private load(): CardEntry[] {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : [];
  }

  private persist(cards: CardEntry[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(cards));
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
  getTombstones(): Tombstone[] {
    const raw = localStorage.getItem(this.tombstonesKey);
    return raw ? JSON.parse(raw) : [];
  }

  clearTombstones(ids: string[]): void {
    const remaining = this.getTombstones().filter((tombstone) => !ids.includes(tombstone.id));
    localStorage.setItem(this.tombstonesKey, JSON.stringify(remaining));
  }

  // Sync-only: applies an already-reconciled result verbatim — no id
  // generation, no updatedAt restamping, no tombstone side effects — since
  // SyncService has already decided what the merged local state should be.
  applySyncResult(merged: CardEntry[]): void {
    this.cardsSignal.set(merged);
    this.persist(merged);
  }

  private addTombstone(id: string): void {
    const tombstones = this.getTombstones().filter((tombstone) => tombstone.id !== id);
    tombstones.push({ id, deletedAt: new Date().toISOString() });
    localStorage.setItem(this.tombstonesKey, JSON.stringify(tombstones));
  }
}

import { Injectable, computed, signal } from '@angular/core';
import { CardEntry } from '@models/card.model';
import { matchesCardQuery } from '../utils/text-search.util';

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly storageKey = 'grimorio.cards';
  private readonly cardsSignal = signal<CardEntry[]>(this.load());
  readonly cards = this.cardsSignal.asReadonly();

  private load(): CardEntry[] {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : [];
  }

  private persist(cards: CardEntry[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(cards));
  }

  add(card: Omit<CardEntry, 'id'>): CardEntry {
    const entry: CardEntry = { ...card, id: crypto.randomUUID() };
    this.cardsSignal.update((cards) => {
      const next = [...cards, entry];
      this.persist(next);
      return next;
    });
    return entry;
  }

  addMany(cards: Omit<CardEntry, 'id'>[]): CardEntry[] {
    const entries = cards.map((card) => ({ ...card, id: crypto.randomUUID() }));
    this.cardsSignal.update((existing) => {
      const next = [...existing, ...entries];
      this.persist(next);
      return next;
    });
    return entries;
  }

  update(id: string, patch: Partial<CardEntry>): void {
    this.cardsSignal.update((cards) => {
      const next = cards.map((card) => (card.id === id ? { ...card, ...patch } : card));
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
}

import { Injectable, computed, signal } from '@angular/core';
import { CardEntry } from '../models/card.model';

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
}

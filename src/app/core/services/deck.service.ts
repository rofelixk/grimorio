import { Injectable, computed, signal } from '@angular/core';
import { Deck, DeckCard } from '../models/deck.model';

@Injectable({ providedIn: 'root' })
export class DeckService {
  private readonly storageKey = 'grimorio.decks';
  private readonly decksSignal = signal<Deck[]>(this.load());
  readonly decks = this.decksSignal.asReadonly();

  private load(): Deck[] {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : [];
  }

  private persist(decks: Deck[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(decks));
  }

  private update(id: string, patch: (deck: Deck) => Deck): void {
    this.decksSignal.update((decks) => {
      const next = decks.map((deck) => (deck.id === id ? patch(deck) : deck));
      this.persist(next);
      return next;
    });
  }

  add(deck: Omit<Deck, 'id'>): Deck {
    const entry: Deck = { ...deck, id: crypto.randomUUID() };
    this.decksSignal.update((decks) => {
      const next = [...decks, entry];
      this.persist(next);
      return next;
    });
    return entry;
  }

  remove(id: string): void {
    this.decksSignal.update((decks) => {
      const next = decks.filter((deck) => deck.id !== id);
      this.persist(next);
      return next;
    });
  }

  byId(id: string) {
    return computed(() => this.decks().find((deck) => deck.id === id));
  }

  setCommander(deckId: string, card: DeckCard | null): void {
    this.update(deckId, (deck) => ({ ...deck, commander: card }));
  }

  addCard(deckId: string, card: DeckCard): void {
    this.update(deckId, (deck) => ({ ...deck, cards: [...deck.cards, card] }));
  }

  removeCard(deckId: string, cardId: string): void {
    this.update(deckId, (deck) => ({
      ...deck,
      cards: deck.cards.filter((card) => card.id !== cardId),
    }));
  }
}

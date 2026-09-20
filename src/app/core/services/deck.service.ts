import { Injectable, computed, signal } from '@angular/core';
import { Deck, DeckCard } from '@models/deck.model';
import { getAllFromStore, replaceStore } from '../db/entity-store';

@Injectable({ providedIn: 'root' })
export class DeckService {
  private readonly decksSignal = signal<Deck[]>([]);
  readonly decks = this.decksSignal.asReadonly();

  private readonly readyPromise: Promise<void>;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.readyPromise = this.hydrate();
  }

  private async hydrate(): Promise<void> {
    const decks = await getAllFromStore<Deck>('decks');
    this.decksSignal.set(decks);
  }

  // Resolves once this service's initial IndexedDB read has landed in the signal.
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  // Resolves once every write enqueued so far has landed in IndexedDB.
  flush(): Promise<void> {
    return this.writeQueue.then(() => undefined);
  }

  private persist(decks: Deck[]): void {
    this.writeQueue = this.writeQueue
      .then(() => replaceStore('decks', decks))
      .catch((e) => console.error('Grimorio: failed to persist decks.', e));
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

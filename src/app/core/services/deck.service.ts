import { Injectable, computed, signal } from '@angular/core';
import { Deck, DeckCard } from '@models/deck.model';
import { currentDbHandle, getAllFromStore, replaceStore, setActiveProfileDb } from '../db/entity-store';

@Injectable({ providedIn: 'root' })
export class DeckService {
  private readonly decksSignal = signal<Deck[]>([]);
  readonly decks = this.decksSignal.asReadonly();

  private readonly changeCountSignal = signal(0);
  // Bumped by user mutations (add/addMany/update/remove), never by applySyncResult — feeds
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
    this.decksSignal.set([]);
    this.readyPromise = (async () => {
      await this.flush();
      await setActiveProfileDb(profileId);
      const decks = await getAllFromStore<Deck>('decks');
      if (generation === this.loadGeneration) {
        this.decksSignal.set(decks);
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

  private persist(decks: Deck[]): void {
    const handle = currentDbHandle();
    this.writeQueue = this.writeQueue
      .then(() => replaceStore('decks', decks, handle))
      .catch((e) => console.error('Grimorio: failed to persist decks.', e));
  }

  private update(id: string, patch: (deck: Deck) => Deck): void {
    this.decksSignal.update((decks) => {
      const next = decks.map((deck) => (deck.id === id ? patch(deck) : deck));
      this.persist(next);
      return next;
    });
    this.changeCountSignal.update((n) => n + 1);
  }

  add(deck: Omit<Deck, 'id'>): Deck {
    const entry: Deck = { ...deck, id: crypto.randomUUID() };
    this.decksSignal.update((decks) => {
      const next = [...decks, entry];
      this.persist(next);
      return next;
    });
    this.changeCountSignal.update((n) => n + 1);
    return entry;
  }

  remove(id: string): void {
    this.decksSignal.update((decks) => {
      const next = decks.filter((deck) => deck.id !== id);
      this.persist(next);
      return next;
    });
    this.changeCountSignal.update((n) => n + 1);
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

import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Deck, DeckFormatId, DeckNameError } from '@models/deck.model';
import { Tombstone } from '@models/tombstone.model';
import { compareDeckNames, validateDeckName } from '../utils/deck.util';
import {
  RowOp,
  boundProfileId,
  clearTombstones,
  currentDbHandle,
  getAllFromStore,
  getTombstonesFor,
  setActiveProfileDb,
  writeRows,
} from '../db/entity-store';
import { CardService } from './card.service';
import { CrossTabService } from './cross-tab.service';
import { SaveQueueService } from './save-queue.service';

// Decks (spec 009): a card location next to collections. Every write is a per-row `writeRows`
// with the profile handle captured when it's enqueued (research R3), like CollectionService.
@Injectable({ providedIn: 'root' })
export class DeckService {
  private readonly cards = inject(CardService);

  private readonly decksSignal = signal<Deck[]>([]);
  readonly decks: Signal<Deck[]> = this.decksSignal.asReadonly();

  readonly sorted: Signal<Deck[]> = computed(() => [...this.decks()].sort(compareDeckNames));

  readonly byId: Signal<Map<string, Deck>> = computed(() => new Map(this.decks().map((deck) => [deck.id, deck])));

  // Read by CollectionService.stats (research R1): a card placed in a deck is not a holding-box card.
  readonly ids: Signal<ReadonlySet<string>> = computed(() => new Set(this.decks().map((deck) => deck.id)));

  private readonly changeCountSignal = signal(0);
  // Bumped by user mutations (create/update/remove), never by applySyncResult.
  readonly changeCount = this.changeCountSignal.asReadonly();

  private readyPromise: Promise<void> = Promise.resolve();
  private loadGeneration = 0;
  private readonly queue = inject(SaveQueueService).create('decks');
  private readonly crossTab = inject(CrossTabService);

  constructor() {
    this.crossTab.on('decks', () => this.refresh());
  }

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
    return this.queue.flush();
  }

  // Re-reads the bound profile's decks after another copy saved them (research R5). Never clears
  // the signal first, never bumps changeCount and never writes; loses to a newer load(), and reads
  // again if a change made here lands meanwhile, so it never overwrites it.
  async refresh(): Promise<void> {
    const generation = this.loadGeneration;
    const before = this.decksSignal();
    const handle = currentDbHandle();
    await this.flush();
    const decks = await getAllFromStore<Deck>('decks', handle);
    if (generation !== this.loadGeneration) {
      return;
    }
    if (this.decksSignal() !== before) {
      return this.refresh();
    }
    this.decksSignal.set(decks);
  }

  // Queues one writeRows transaction with the profile it targets, announcing every kind it touched.
  private save(ops: RowOp[]): void {
    const handle = currentDbHandle();
    const profileId = boundProfileId();
    this.queue.enqueue(
      () => writeRows(ops, handle),
      () => this.announce(ops, profileId),
    );
  }

  private announce(ops: RowOp[], profileId: string | null): void {
    for (const store of new Set(ops.map((op) => op.store))) {
      if (store !== 'tombstones') {
        this.crossTab.announce(store, profileId);
      }
    }
  }

  /** Copies (Σ quantity) of the cards whose `locationId` is this deck. */
  cardCount(id: string): number {
    return this.cards.cards().reduce((sum, card) => (card.locationId === id ? sum + card.quantity : sum), 0);
  }

  create(input: { name: string; format: DeckFormatId }): { ok: true; deck: Deck } | { ok: false; error: DeckNameError } {
    const error = validateDeckName(input.name, this.decks());
    if (error) return { ok: false, error };

    const deck: Deck = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      format: input.format,
      updatedAt: new Date().toISOString(),
    };
    this.decksSignal.update((decks) => [...decks, deck]);
    this.changeCountSignal.update((n) => n + 1);
    this.save([{ store: 'decks', put: deck }]);
    return { ok: true, deck };
  }

  /** Renames and/or changes the format of one deck; the name is validated only when it changes. */
  update(
    id: string,
    patch: { name?: string; format?: DeckFormatId },
  ): { ok: true } | { ok: false; error: DeckNameError | 'not-found' } {
    const current = this.byId().get(id);
    if (!current) return { ok: false, error: 'not-found' };

    let name = current.name;
    if (patch.name !== undefined && patch.name.trim() !== current.name) {
      const error = validateDeckName(patch.name, this.decks(), id);
      if (error) return { ok: false, error };
      name = patch.name.trim();
    }

    const updated: Deck = { ...current, name, format: patch.format ?? current.format, updatedAt: new Date().toISOString() };
    this.decksSignal.update((decks) => decks.map((deck) => (deck.id === id ? updated : deck)));
    this.changeCountSignal.update((n) => n + 1);
    this.save([{ store: 'decks', put: updated }]);
    return { ok: true };
  }

  /**
   * Deletes a deck (FR-009): the row and its tombstone in one transaction, and **no card write** —
   * the deck's cards now match no location, which puts them in the holding box (research R1).
   * Settles when the transaction commits, with the copies that went to the holding box.
   */
  remove(id: string): Promise<{ cards: number }> {
    if (!this.byId().has(id)) {
      return Promise.resolve({ cards: 0 });
    }
    const result = { cards: this.cardCount(id) };
    const deletedAt = new Date().toISOString();
    const ops: RowOp[] = [
      { store: 'decks', delete: id },
      { store: 'tombstones', put: { key: `decks:${id}`, entity: 'decks', id, deletedAt } },
    ];

    this.decksSignal.update((decks) => decks.filter((deck) => deck.id !== id));
    this.changeCountSignal.update((n) => n + 1);
    const handle = currentDbHandle();
    const profileId = boundProfileId();
    return this.queue
      .run(() => writeRows(ops, handle))
      .then(() => {
        this.announce(ops, profileId);
        return result;
      });
  }

  // Sync-only: tombstones let SyncService tell a locally-deleted id apart from one that never
  // existed on this device, so a pull doesn't resurrect a deck this device removed.
  getTombstones(): Promise<Tombstone[]> {
    return getTombstonesFor('decks');
  }

  clearTombstones(ids: string[]): Promise<void> {
    return clearTombstones('decks', ids);
  }

  // Sync-only: applies an already-reconciled result verbatim — no id generation, no restamping,
  // no tombstoning. Writes only the diff: a put per changed row, a delete per id gone.
  applySyncResult(merged: Deck[]): void {
    const before = this.byId();
    const mergedIds = new Set(merged.map((deck) => deck.id));
    const ops: RowOp[] = [];
    for (const deck of merged) {
      if (!sameDeck(before.get(deck.id), deck)) {
        ops.push({ store: 'decks', put: deck });
      }
    }
    for (const id of before.keys()) {
      if (!mergedIds.has(id)) {
        ops.push({ store: 'decks', delete: id });
      }
    }
    this.decksSignal.set(merged);
    if (ops.length > 0) {
      this.save(ops);
    }
  }
}

function sameDeck(a: Deck | undefined, b: Deck): boolean {
  return !!a && a.name === b.name && a.format === b.format && a.updatedAt === b.updatedAt;
}

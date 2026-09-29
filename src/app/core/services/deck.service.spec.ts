import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockCardEntry } from '@testing/card.mocks';
import { CardEntry } from '@models/card.model';
import { Deck } from '@models/deck.model';
import { getAllFromStore } from '../db/entity-store';
import { closeProfileDb, openProfileDb } from '../db/profile-db';
import { CardService } from './card.service';
import { CollectionService } from './collection.service';
import { DeckService } from './deck.service';

function mockDeck(overrides: Partial<Deck> = {}): Deck {
  return { id: 'd1', name: 'Krenko goblins', format: 'commander', updatedAt: '2026-01-01T00:00:00.000Z', ...overrides };
}

async function seed(profileId: string, decks: Deck[], cards: CardEntry[] = []): Promise<void> {
  const db = await openProfileDb(profileId);
  const tx = db.transaction(['decks', 'cards'], 'readwrite');
  await Promise.all([
    ...decks.map((d) => tx.objectStore('decks').put(d)),
    ...cards.map((c) => tx.objectStore('cards').put(c)),
    tx.done,
  ]);
}

function created(result: ReturnType<DeckService['create']>): Deck {
  if (!result.ok) throw new Error(`create failed: ${result.error}`);
  return result.deck;
}

describe('DeckService', () => {
  let service: DeckService;
  let cards: CardService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeckService);
    cards = TestBed.inject(CardService);
    await cards.load('p1');
    await service.load('p1');
  });

  afterEach(async () => {
    await service.flush();
    await cards.flush();
  });

  it('starts empty when nothing is persisted', () => {
    expect(service.decks()).toEqual([]);
  });

  it('hydrates from seeded rows', async () => {
    const deck = mockDeck();
    await seed('p1', [deck]);

    await service.load('p1');

    expect(service.decks()).toEqual([deck]);
    expect(service.byId().get('d1')).toEqual(deck);
    expect(service.ids().has('d1')).toBe(true);
  });

  it('isolates load between two profiles', async () => {
    const deck = mockDeck();
    await seed('p1', [deck]);
    await service.load('p1');
    expect(service.decks()).toEqual([deck]);

    await service.load('p2');
    expect(service.decks()).toEqual([]);

    await service.load('p1');
    expect(service.decks()).toEqual([deck]);
  });

  it('sorts alphabetically in pt-BR, ignoring case and accents', async () => {
    await seed('p1', [mockDeck({ id: 'a', name: 'zur' }), mockDeck({ id: 'b', name: 'Élesh' }), mockDeck({ id: 'c', name: 'Atraxa' })]);
    await service.load('p1');

    expect(service.sorted().map((d) => d.name)).toEqual(['Atraxa', 'Élesh', 'zur']);
  });

  it('counts the copies of cards whose location is the deck', async () => {
    await seed(
      'p1',
      [mockDeck()],
      [mockCardEntry({ id: 'x', locationId: 'd1', quantity: 3 }), mockCardEntry({ id: 'y', locationId: 'd1', quantity: 1 }), mockCardEntry({ id: 'z', locationId: 'other', quantity: 5 })],
    );
    await cards.load('p1');
    await service.load('p1');

    expect(service.cardCount('d1')).toBe(4);
    expect(service.cardCount('missing')).toBe(0);
  });

  describe('applySyncResult', () => {
    it('writes only the diff and never bumps changeCount', async () => {
      const kept = mockDeck({ id: 'd1', name: 'Kept' });
      const changed = mockDeck({ id: 'd2', name: 'Before' });
      const gone = mockDeck({ id: 'd3', name: 'Gone' });
      await seed('p1', [kept, changed, gone]);
      await service.load('p1');
      // Tamper with the stored copy of the unchanged row: a rewrite would overwrite it.
      await (await openProfileDb('p1')).put('decks', { ...kept, name: 'Tampered' });

      const after = { ...changed, name: 'After', updatedAt: '2026-02-01T00:00:00.000Z' };
      const added = mockDeck({ id: 'd4', name: 'New' });
      service.applySyncResult([kept, after, added]);
      await service.flush();

      const stored = await getAllFromStore<Deck>('decks');
      expect(stored.sort((a, b) => a.id.localeCompare(b.id))).toEqual([{ ...kept, name: 'Tampered' }, after, added]);
      expect(service.decks()).toEqual([kept, after, added]);
      expect(service.changeCount()).toBe(0);
    });
  });

  describe('create', () => {
    it('persists across a reload', async () => {
      const deck = created(service.create({ name: '  Krenko goblins ', format: 'commander' }));
      expect(deck.name).toBe('Krenko goblins');
      await service.flush();

      await service.load('p2');
      await service.load('p1');
      expect(service.decks()).toEqual([deck]);
      expect(service.changeCount()).toBe(1);
    });

    it('writes nothing on each name error', async () => {
      created(service.create({ name: 'Krenko goblins', format: 'commander' }));
      await service.flush();

      expect(service.create({ name: '  ', format: 'pauper' })).toEqual({ ok: false, error: 'empty' });
      expect(service.create({ name: 'a'.repeat(41), format: 'pauper' })).toEqual({ ok: false, error: 'too-long' });
      expect(service.create({ name: 'krênko GOBLINS', format: 'pauper' })).toEqual({ ok: false, error: 'taken' });
      await service.flush();

      expect(await getAllFromStore<Deck>('decks')).toHaveLength(1);
      expect(service.decks()).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('renames by writing exactly one row', async () => {
      const a = created(service.create({ name: 'Elfos', format: 'pauper' }));
      const b = created(service.create({ name: 'Goblins', format: 'modern' }));
      await service.flush();
      // Tamper with b's stored copy: only a's row may be written by the rename.
      await (await openProfileDb('p1')).put('decks', { ...b, name: 'Tampered' });

      expect(service.update(a.id, { name: 'Elfos de Llanowar' })).toEqual({ ok: true });
      await service.flush();

      const stored = await getAllFromStore<Deck>('decks');
      expect(stored.find((d) => d.id === a.id)?.name).toBe('Elfos de Llanowar');
      expect(stored.find((d) => d.id === b.id)?.name).toBe('Tampered');
    });

    it('changes the format with an unchanged name', () => {
      const deck = created(service.create({ name: 'Elfos', format: 'pauper' }));

      expect(service.update(deck.id, { name: ' Elfos ', format: 'vintage' })).toEqual({ ok: true });
      expect(service.byId().get(deck.id)?.format).toBe('vintage');
    });

    it('rejects an accent-only duplicate and an unknown id', () => {
      created(service.create({ name: 'Krenko', format: 'commander' }));
      const other = created(service.create({ name: 'Elfos', format: 'pauper' }));

      expect(service.update(other.id, { name: 'krênko' })).toEqual({ ok: false, error: 'taken' });
      expect(service.update('missing', { name: 'x' })).toEqual({ ok: false, error: 'not-found' });
    });
  });

  describe('remove', () => {
    it('writes the row delete and the tombstone together', async () => {
      const deck = created(service.create({ name: 'Elfos', format: 'pauper' }));

      await expect(service.remove(deck.id)).resolves.toEqual({ cards: 0 });

      expect(service.decks()).toEqual([]);
      expect(await getAllFromStore<Deck>('decks')).toEqual([]);
      expect((await service.getTombstones()).map((t) => t.id)).toEqual([deck.id]);
    });

    it('resolves zero and writes nothing for an unknown id', async () => {
      await expect(service.remove('missing')).resolves.toEqual({ cards: 0 });
      expect(await service.getTombstones()).toEqual([]);
    });

    it('leaves both the row and the tombstone unwritten when the transaction fails', async () => {
      const deck = mockDeck();
      await seed('p1', [deck]);
      await service.load('p1');
      (await openProfileDb('p1')).close();

      await expect(service.remove(deck.id)).rejects.toBeDefined();

      await closeProfileDb();
      const db = await openProfileDb('p1');
      expect(await db.getAll('decks')).toEqual([deck]);
      expect(await db.getAll('tombstones')).toEqual([]);
    });

    it('writes no card: the deck cards land in the holding box unchanged (SC-004)', async () => {
      const collections = TestBed.inject(CollectionService);
      const card = mockCardEntry({ id: 'x', locationId: 'd1', quantity: 3 });
      await seed('p1', [mockDeck()], [card]);
      await cards.load('p1');
      await collections.load('p1');
      await service.load('p1');
      expect(collections.stats().holding.cards).toBe(0);

      await expect(service.remove('d1')).resolves.toEqual({ cards: 3 });

      expect(await getAllFromStore<CardEntry>('cards')).toEqual([card]);
      expect(collections.stats().holding.cards).toBe(3);
    });
  });
});

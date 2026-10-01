import { beforeEach, describe, expect, it } from 'vitest';
import type { CardEntry } from '@models/card.model';
import type { Collection } from '@models/collection.model';
import type { Deck } from '@models/deck.model';
import { mockCardEntry } from '@testing/card.mocks';
import {
  RowOp,
  currentDbHandle,
  getAllFromStore,
  getMeta,
  getTombstonesFor,
  setActiveProfileDb,
  setMeta,
  writeRows,
} from './entity-store';
import { TombstoneRecord } from './profile-db';

const AT = '2026-01-01T00:00:00.000Z';

const collection = (id: string): Collection => ({ id, name: id, color: '#d8cdb0', parentId: null, updatedAt: AT });
const deck = (id: string): Deck => ({ id, name: id, format: 'commander', updatedAt: AT });
const tombstone = (id: string): TombstoneRecord => ({ key: `cards:${id}`, entity: 'cards', id, deletedAt: AT });

async function snapshot() {
  return {
    collections: await getAllFromStore<Collection>('collections'),
    decks: await getAllFromStore<Deck>('decks'),
    cards: await getAllFromStore<CardEntry>('cards'),
    tombstones: await getTombstonesFor('cards'),
  };
}

describe('entity-store', () => {
  describe('writeRows', () => {
    beforeEach(async () => {
      await setActiveProfileDb('A');
      await writeRows([
        { store: 'collections', put: collection('col-old') },
        { store: 'decks', put: deck('deck-old') },
        { store: 'cards', put: mockCardEntry({ id: 'card-old' }) },
        { store: 'tombstones', put: tombstone('gone-old') },
      ]);
    });

    it('applies puts and deletes across every store it touches', async () => {
      await writeRows([
        { store: 'collections', delete: 'col-old' },
        { store: 'collections', put: collection('col-new') },
        { store: 'decks', put: deck('deck-new') },
        { store: 'cards', put: mockCardEntry({ id: 'card-old', locationId: 'deck-new' }) },
        { store: 'tombstones', put: tombstone('gone-new') },
      ]);

      const after = await snapshot();
      expect(after.collections.map((row) => row.id)).toEqual(['col-new']);
      expect(after.decks.map((row) => row.id).sort()).toEqual(['deck-new', 'deck-old']);
      expect(after.cards).toEqual([mockCardEntry({ id: 'card-old', locationId: 'deck-new' })]);
      expect(after.tombstones.map((row) => row.id).sort()).toEqual(['gone-new', 'gone-old']);
    });

    it('keeps none of its changes when a later op fails', async () => {
      const before = await snapshot();
      const { id: _id, ...withoutKey } = mockCardEntry({ id: 'card-new' });
      void _id;
      const ops: RowOp[] = [
        { store: 'collections', delete: 'col-old' },
        { store: 'collections', put: collection('col-new') },
        { store: 'decks', delete: 'deck-old' },
        { store: 'decks', put: deck('deck-new') },
        { store: 'cards', put: mockCardEntry({ id: 'card-old', quantity: 9 }) },
        { store: 'tombstones', put: tombstone('gone-new') },
        // Missing its `id` keyPath: the put throws.
        { store: 'cards', put: withoutKey as CardEntry },
      ];

      await expect(writeRows(ops)).rejects.toThrow();

      expect(await snapshot()).toEqual(before);
    });

    it('resolves without opening anything for an empty op list', async () => {
      // A null handle would reject the moment a database is required.
      await expect(writeRows([], null)).resolves.toBeUndefined();
    });
  });

  describe('with no bound profile', () => {
    it('rejects writes and reads back empty', async () => {
      expect(currentDbHandle()).toBeNull();

      await expect(writeRows([{ store: 'decks', put: deck('d1') }])).rejects.toThrow('No active profile');
      await expect(setMeta('k', 1)).rejects.toThrow('No active profile');
      expect(await getAllFromStore('cards')).toEqual([]);
      expect(await getTombstonesFor('cards')).toEqual([]);
      expect(await getMeta('k')).toBeUndefined();
    });

    it('unbinds when set to null', async () => {
      await setActiveProfileDb('A');
      await setActiveProfileDb(null);

      expect(currentDbHandle()).toBeNull();
      await expect(writeRows([{ store: 'decks', put: deck('d1') }])).rejects.toThrow('No active profile');
    });
  });

  describe('setActiveProfileDb', () => {
    it("rebinds every read and write to the other profile's database", async () => {
      await setActiveProfileDb('A');
      await writeRows([{ store: 'decks', put: deck('deck-a') }]);
      await setMeta('k', 'a');

      await setActiveProfileDb('B');
      expect(await getAllFromStore('decks')).toEqual([]);
      expect(await getMeta('k')).toBeUndefined();
      await writeRows([{ store: 'decks', put: deck('deck-b') }]);

      await setActiveProfileDb('A');
      expect(await getAllFromStore('decks')).toEqual([deck('deck-a')]);
      expect(await getMeta('k')).toBe('a');

      await setActiveProfileDb('B');
      expect(await getAllFromStore('decks')).toEqual([deck('deck-b')]);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import type { Collection } from '@models/collection.model';
import type { Deck } from '@models/deck.model';
import { setActiveProfileDb, writeRows } from './entity-store';
import { closeProfileDb, deleteProfileDb, openProfileDb } from './profile-db';

describe('openProfileDb', () => {
  it('creates the expected object stores, with no locations store', async () => {
    const db = await openProfileDb('p1');

    expect(db.name).toBe('grimorio-profile-p1');
    expect(Array.from(db.objectStoreNames).sort()).toEqual(['cards', 'collections', 'decks', 'meta', 'tombstones']);
    expect(Array.from(db.objectStoreNames as unknown as string[])).not.toContain('locations');
  });

  it('memoizes concurrent calls for one profile to a single connection', async () => {
    const [a, b, c] = await Promise.all([openProfileDb('p1'), openProfileDb('p1'), openProfileDb('p1')]);

    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('keeps each profile in its own database', async () => {
    const a = await openProfileDb('p1');
    await a.put('decks', { id: 'd1', name: 'A', format: 'commander', updatedAt: 't1' });
    const b = await openProfileDb('p2');

    expect(await b.getAll('decks')).toEqual([]);
    expect(await a.getAll('decks')).toHaveLength(1);
  });

  it('closes every connection except the one kept', async () => {
    const a = await openProfileDb('p1');
    await openProfileDb('p2');
    await closeProfileDb('p1');

    expect(await openProfileDb('p1')).toBe(a);
    expect(await openProfileDb('p2')).not.toBe(a);
  });

  it('drops old-shaped deck rows when a v2 database opens at v3, keeping cards and collections', async () => {
    const v2 = await openDB('grimorio-profile-p1', 2, {
      upgrade(db) {
        db.createObjectStore('cards', { keyPath: 'id' });
        db.createObjectStore('collections', { keyPath: 'id' });
        db.createObjectStore('decks', { keyPath: 'id' });
        db.createObjectStore('tombstones', { keyPath: 'key' }).createIndex('by-entity', 'entity');
        db.createObjectStore('meta', { keyPath: 'key' });
      },
    });
    await v2.put('decks', { id: 'old', name: 'Old', commander: null, cards: [] });
    await v2.put('cards', { id: 'card-1' });
    await v2.put('collections', { id: 'c1', name: 'Caixa' });
    v2.close();

    const db = await openProfileDb('p1');

    expect(db.version).toBe(3);
    expect(await db.getAll('decks')).toEqual([]);
    expect(await db.getAll('cards')).toHaveLength(1);
    expect(await db.getAll('collections')).toHaveLength(1);
  });

  it('deletes one profile database, leaving another untouched', async () => {
    const a = await openProfileDb('p1');
    await a.put('decks', { id: 'd1', name: 'A', format: 'commander', updatedAt: 't1' });
    const b = await openProfileDb('p2');
    await b.put('decks', { id: 'd2', name: 'B', format: 'modern', updatedAt: 't2' });

    await deleteProfileDb('p1');

    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names).not.toContain('grimorio-profile-p1');
    expect(await b.getAll('decks')).toHaveLength(1);
    expect(await (await openProfileDb('p1')).getAll('decks')).toEqual([]);
  });
});

describe('writeRows', () => {
  const collectionA: Collection = { id: 'c1', name: 'A', color: '#d8cdb0', parentId: null, updatedAt: 't1' };
  const collectionB: Collection = { id: 'c2', name: 'B', color: '#3d6b85', parentId: null, updatedAt: 't2' };

  it('applies puts and deletes across stores atomically', async () => {
    await setActiveProfileDb('p1');
    await writeRows([
      { store: 'collections', put: collectionA },
      { store: 'collections', put: collectionB },
    ]);
    await writeRows([{ store: 'collections', delete: collectionA.id }]);

    const db = await openProfileDb('p1');
    expect(await db.getAll('collections')).toEqual([collectionB]);
  });

  it('rolls back every op in the transaction when one fails', async () => {
    await setActiveProfileDb('p1');
    await expect(
      writeRows([
        { store: 'collections', put: collectionA },
        // missing `id` (the keyPath): a synchronous DataError that aborts the whole transaction.
        { store: 'collections', put: {} as never },
      ]),
    ).rejects.toThrow();

    const db = await openProfileDb('p1');
    expect(await db.getAll('collections')).toEqual([]);
  });

  it('puts and deletes deck rows alongside a deck tombstone in one transaction', async () => {
    await setActiveProfileDb('p1');
    const deck: Deck = { id: 'd1', name: 'Elfos', format: 'pauper', updatedAt: 't1' };
    const kept: Deck = { id: 'd2', name: 'Goblins', format: 'modern', updatedAt: 't1' };
    await writeRows([
      { store: 'decks', put: deck },
      { store: 'decks', put: kept },
    ]);
    await writeRows([
      { store: 'decks', delete: deck.id },
      { store: 'tombstones', put: { key: 'decks:d1', entity: 'decks', id: 'd1', deletedAt: 't2' } },
    ]);

    const db = await openProfileDb('p1');
    expect(await db.getAll('decks')).toEqual([kept]);
    expect(await db.getAllFromIndex('tombstones', 'by-entity', 'decks')).toEqual([
      { key: 'decks:d1', entity: 'decks', id: 'd1', deletedAt: 't2' },
    ]);
  });

  it('rejects when no profile is bound', async () => {
    await expect(writeRows([{ store: 'collections', delete: 'x' }])).rejects.toThrow('No active profile');
  });

  it('resolves without opening a transaction for an empty op list', async () => {
    await expect(writeRows([])).resolves.toBeUndefined();
  });
});

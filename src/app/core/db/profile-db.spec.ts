import { describe, expect, it } from 'vitest';
import { closeProfileDb, deleteProfileDb, openProfileDb } from './profile-db';

describe('openProfileDb', () => {
  it('creates the expected object stores', async () => {
    const db = await openProfileDb('p1');

    expect(db.name).toBe('grimorio-profile-p1');
    expect(Array.from(db.objectStoreNames).sort()).toEqual(['cards', 'decks', 'locations', 'meta', 'tombstones']);
  });

  it('memoizes concurrent calls for one profile to a single connection', async () => {
    const [a, b, c] = await Promise.all([openProfileDb('p1'), openProfileDb('p1'), openProfileDb('p1')]);

    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('keeps each profile in its own database', async () => {
    const a = await openProfileDb('p1');
    await a.put('decks', { id: 'd1', name: 'A', commander: null, cards: [] } as never);
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

  it('deletes one profile database, leaving another untouched', async () => {
    const a = await openProfileDb('p1');
    await a.put('decks', { id: 'd1', name: 'A', commander: null, cards: [] } as never);
    const b = await openProfileDb('p2');
    await b.put('decks', { id: 'd2', name: 'B', commander: null, cards: [] } as never);

    await deleteProfileDb('p1');

    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names).not.toContain('grimorio-profile-p1');
    expect(await b.getAll('decks')).toHaveLength(1);
    expect(await (await openProfileDb('p1')).getAll('decks')).toEqual([]);
  });
});

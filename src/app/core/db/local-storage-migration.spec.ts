import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllFromStore, getMeta, getTombstonesFor } from './entity-store';
import { getGrimorioDb, reopenGrimorioDbForTests, resetGrimorioDbForTests } from './grimorio-db';

describe('localStorage -> IndexedDB migration', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetGrimorioDbForTests();
  });

  it('is a no-op on a fresh install but still sets the migrated flag', async () => {
    await getGrimorioDb();

    expect(await getMeta('localStorageMigrated')).toBe(true);
    expect(await getAllFromStore('cards')).toEqual([]);
  });

  it('migrates cards, locations, decks, tombstones and lastSyncedAt, then clears the old keys', async () => {
    const card = { id: 'c1', name: 'Sol Ring', updatedAt: '2026-01-01T00:00:00.000Z' };
    const location = { id: 'l1', name: 'Box 1', parentId: null, updatedAt: '2026-01-01T00:00:00.000Z' };
    const deck = { id: 'd1', name: 'Deck', commander: null, cards: [] };
    localStorage.setItem('grimorio.cards', JSON.stringify([card]));
    localStorage.setItem('grimorio.locations', JSON.stringify([location]));
    localStorage.setItem('grimorio.decks', JSON.stringify([deck]));
    localStorage.setItem(
      'grimorio.cards.tombstones',
      JSON.stringify([{ id: 'gone-card', deletedAt: '2026-01-02T00:00:00.000Z' }]),
    );
    localStorage.setItem(
      'grimorio.locations.tombstones',
      JSON.stringify([{ id: 'gone-location', deletedAt: '2026-01-02T00:00:00.000Z' }]),
    );
    localStorage.setItem('grimorio.lastSyncedAt', '2026-01-03T00:00:00.000Z');

    await getGrimorioDb();

    expect(await getAllFromStore('cards')).toEqual([card]);
    expect(await getAllFromStore('locations')).toEqual([location]);
    expect(await getAllFromStore('decks')).toEqual([deck]);
    expect(await getTombstonesFor('cards')).toEqual([{ id: 'gone-card', deletedAt: '2026-01-02T00:00:00.000Z' }]);
    expect(await getTombstonesFor('locations')).toEqual([
      { id: 'gone-location', deletedAt: '2026-01-02T00:00:00.000Z' },
    ]);
    expect(await getMeta('lastSyncedAt')).toBe('2026-01-03T00:00:00.000Z');

    expect(localStorage.getItem('grimorio.cards')).toBeNull();
    expect(localStorage.getItem('grimorio.locations')).toBeNull();
    expect(localStorage.getItem('grimorio.decks')).toBeNull();
    expect(localStorage.getItem('grimorio.cards.tombstones')).toBeNull();
    expect(localStorage.getItem('grimorio.locations.tombstones')).toBeNull();
    expect(localStorage.getItem('grimorio.lastSyncedAt')).toBeNull();
  });

  it('skips a corrupted key but still migrates the rest and completes', async () => {
    localStorage.setItem('grimorio.cards', 'not valid json');
    const location = { id: 'l1', name: 'Box 1', parentId: null, updatedAt: '2026-01-01T00:00:00.000Z' };
    localStorage.setItem('grimorio.locations', JSON.stringify([location]));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await getGrimorioDb();

    expect(await getAllFromStore('cards')).toEqual([]);
    expect(await getAllFromStore('locations')).toEqual([location]);
    expect(await getMeta('localStorageMigrated')).toBe(true);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('does not re-run once already migrated', async () => {
    localStorage.setItem('grimorio.cards', JSON.stringify([{ id: 'c1', name: 'Sol Ring' }]));
    await getGrimorioDb();

    // A key reappearing after migration already completed (e.g. stale code path)
    // must be ignored by a second open of the same database.
    localStorage.setItem('grimorio.cards', JSON.stringify([{ id: 'c2', name: 'Lightning Bolt' }]));
    await reopenGrimorioDbForTests();
    await getGrimorioDb();

    expect(await getAllFromStore('cards')).toEqual([{ id: 'c1', name: 'Sol Ring' }]);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { getGrimorioDb, resetGrimorioDbForTests } from './grimorio-db';

describe('getGrimorioDb', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetGrimorioDbForTests();
  });

  it('creates the expected object stores', async () => {
    const db = await getGrimorioDb();

    expect(Array.from(db.objectStoreNames).sort()).toEqual(['cards', 'decks', 'locations', 'meta', 'tombstones']);
  });

  it('memoizes concurrent calls to a single database instance', async () => {
    const [a, b, c] = await Promise.all([getGrimorioDb(), getGrimorioDb(), getGrimorioDb()]);

    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { type TakeoverEvent, isClosedConnectionError, onTakeover } from './connection-events';
import { DEVICE_DB_NAME, getDeviceDb } from './device-db';

describe('getDeviceDb', () => {
  it('closes and emits upgrade when another copy opens a newer version, keeping the closed connection', async () => {
    const events: TakeoverEvent[] = [];
    onTakeover((event) => events.push(event));
    const db = await getDeviceDb();

    const newer = await openDB(DEVICE_DB_NAME, 2);
    newer.close();

    expect(events).toEqual([{ kind: 'upgrade' }]);
    expect(await getDeviceDb()).toBe(db);
    const failure = await db.get('meta', 'x').catch((error: unknown) => error);
    expect(isClosedConnectionError(failure)).toBe(true);
  });
});

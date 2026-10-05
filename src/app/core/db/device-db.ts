import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { ProfileRecord } from '@models/profile.model';
import { emitTakeover } from './connection-events';

interface DeviceMetaRecord {
  key: string;
  value: unknown;
}

// Device-level registry, not tied to any profile (R1): every local profile, plus which one is
// active. Each profile's owned data lives in its own `grimorio-profile-{id}` database.
export interface DeviceDbSchema extends DBSchema {
  profiles: { key: string; value: ProfileRecord };
  meta: { key: string; value: DeviceMetaRecord };
}

export const DEVICE_DB_NAME = 'grimorio-device';
/** The `meta` key holding which profile is active (`string | null`). */
export const ACTIVE_PROFILE_KEY = 'activeProfileId';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DeviceDbSchema>> | null = null;

export function getDeviceDb(): Promise<IDBPDatabase<DeviceDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DeviceDbSchema>(DEVICE_DB_NAME, DB_VERSION, {
      // Another copy opened a newer version (spec 011 R4): close at once so it isn't blocked, and
      // keep the closed connection memoized so this copy never reopens it at the old version.
      blocking(_currentVersion, _blockedVersion, event) {
        (event.target as IDBDatabase).close();
        emitTakeover({ kind: 'upgrade' });
      },
      upgrade(db) {
        db.createObjectStore('profiles', { keyPath: 'id' });
        db.createObjectStore('meta', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

// Test-only: closes the connection and clears the memoized promise so the database can be
// deleted and reopened fresh. Not used by production code.
export async function resetDeviceDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
  }
  dbPromise = null;
}

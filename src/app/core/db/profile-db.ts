import { DBSchema, IDBPDatabase, deleteDB, openDB } from 'idb';
import { CardEntry } from '@models/card.model';
import { Collection } from '@models/collection.model';
import { Deck } from '@models/deck.model';
import { emitTakeover } from './connection-events';
import { DEVICE_DB_NAME } from './device-db';

export type TombstoneEntity = 'cards' | 'collections' | 'decks';

export interface TombstoneRecord {
  key: string;
  entity: TombstoneEntity;
  id: string;
  deletedAt: string;
}

interface MetaRecord {
  key: string;
  value: unknown;
}

interface ProfileDbSchema extends DBSchema {
  cards: { key: string; value: CardEntry };
  collections: { key: string; value: Collection };
  decks: { key: string; value: Deck };
  tombstones: {
    key: string;
    value: TombstoneRecord;
    indexes: { 'by-entity': TombstoneEntity };
  };
  meta: { key: string; value: MetaRecord };
}

export type ProfileDb = IDBPDatabase<ProfileDbSchema>;

const DB_VERSION = 3;

export function profileDbName(profileId: string): string {
  return `grimorio-profile-${profileId}`;
}

// One database per profile (R1), so no row can leak across profiles by construction.
// Connections are memoized per profile id; switching closes the previous one.
const connections = new Map<string, Promise<ProfileDb>>();

// Profiles another copy of the app deleted during this page's life (spec 011 R4): never reopened,
// so a deleted database is never recreated empty (FR-010).
const goneProfileIds = new Set<string>();

/** The profile's database was deleted by another copy of the app. */
export class ProfileGoneError extends Error {}

export function openProfileDb(profileId: string): Promise<ProfileDb> {
  if (goneProfileIds.has(profileId)) {
    return Promise.reject(new ProfileGoneError(`Profile ${profileId} was deleted in another window.`));
  }
  let connection = connections.get(profileId);
  if (!connection) {
    connection = openDB<ProfileDbSchema>(profileDbName(profileId), DB_VERSION, {
      // Another copy wants this database (spec 011 R4): close at once so it isn't blocked.
      // A null version means a delete; anything else is a newer version this code doesn't know.
      blocking(_currentVersion, blockedVersion, event) {
        (event.target as IDBDatabase).close();
        if (blockedVersion === null) {
          connections.delete(profileId);
          goneProfileIds.add(profileId);
          emitTakeover({ kind: 'deleted', profileId });
        } else {
          emitTakeover({ kind: 'upgrade' });
        }
      },
      // Not a data migration (research R13): `locations` is simply dropped, and every other
      // store is created only if it's missing, so an existing v1 database ends up with the
      // same stores a fresh v2 database would have gotten. v3 (spec 009) recreates `decks`
      // empty, dropping the old-shaped deck records rather than migrating them.
      upgrade(db, oldVersion) {
        if (oldVersion < 3 && db.objectStoreNames.contains('decks')) {
          db.deleteObjectStore('decks');
        }
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('decks')) {
          db.createObjectStore('decks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tombstones')) {
          const tombstones = db.createObjectStore('tombstones', { keyPath: 'key' });
          tombstones.createIndex('by-entity', 'entity');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
        if (Array.from(db.objectStoreNames as unknown as string[]).includes('locations')) {
          db.deleteObjectStore('locations' as never);
        }
      },
    });
    connections.set(profileId, connection);
  }
  return connection;
}

/** Closes every open profile connection except `keepId` (if given). */
export async function closeProfileDb(keepId: string | null = null): Promise<void> {
  const closing = [...connections.entries()].filter(([id]) => id !== keepId);
  for (const [id] of closing) {
    connections.delete(id);
  }
  await Promise.all(closing.map(([, connection]) => connection.then((db) => db.close()).catch(() => undefined)));
}

/** Closes the profile's connection, then deletes its database (profile deletion, R9). */
export async function deleteProfileDb(profileId: string): Promise<void> {
  const connection = connections.get(profileId);
  connections.delete(profileId);
  await connection?.then((db) => db.close()).catch(() => undefined);
  await deleteDB(profileDbName(profileId));
}

// Test-only: closes every connection and deletes every `grimorio-*` database (the device
// registry and all profile databases), so each spec starts from a clean slate.
export async function resetAllGrimorioDbsForTests(): Promise<void> {
  goneProfileIds.clear();
  await closeProfileDb();
  const names = new Set<string>([DEVICE_DB_NAME, 'grimorio']);
  const listed = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
  for (const { name } of listed) {
    if (name?.startsWith('grimorio')) {
      names.add(name);
    }
  }
  await Promise.all([...names].map((name) => deleteDB(name)));
}

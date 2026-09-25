import { DBSchema, IDBPDatabase, deleteDB, openDB } from 'idb';
import { CardEntry } from '@models/card.model';
import { Deck } from '@models/deck.model';
import { StorageLocation } from '@models/storage-location.model';
import { DEVICE_DB_NAME } from './device-db';

export type TombstoneEntity = 'cards' | 'locations';

export interface TombstoneRecord {
  key: string;
  entity: TombstoneEntity;
  id: string;
  deletedAt: string;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

export interface ProfileDbSchema extends DBSchema {
  cards: { key: string; value: CardEntry };
  locations: { key: string; value: StorageLocation };
  decks: { key: string; value: Deck };
  tombstones: {
    key: string;
    value: TombstoneRecord;
    indexes: { 'by-entity': TombstoneEntity };
  };
  meta: { key: string; value: MetaRecord };
}

export type ProfileDb = IDBPDatabase<ProfileDbSchema>;

const DB_VERSION = 1;

export function profileDbName(profileId: string): string {
  return `grimorio-profile-${profileId}`;
}

// One database per profile (R1), so no row can leak across profiles by construction.
// Connections are memoized per profile id; switching closes the previous one.
const connections = new Map<string, Promise<ProfileDb>>();

export function openProfileDb(profileId: string): Promise<ProfileDb> {
  let connection = connections.get(profileId);
  if (!connection) {
    connection = openDB<ProfileDbSchema>(profileDbName(profileId), DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('cards', { keyPath: 'id' });
        db.createObjectStore('locations', { keyPath: 'id' });
        db.createObjectStore('decks', { keyPath: 'id' });
        const tombstones = db.createObjectStore('tombstones', { keyPath: 'key' });
        tombstones.createIndex('by-entity', 'entity');
        db.createObjectStore('meta', { keyPath: 'key' });
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

// Test-only: closes every connection and deletes every `grimorio-*` database (the device
// registry and all profile databases), so each spec starts from a clean slate.
export async function resetAllGrimorioDbsForTests(): Promise<void> {
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

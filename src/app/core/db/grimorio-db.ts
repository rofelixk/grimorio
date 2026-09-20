import { DBSchema, IDBPDatabase, deleteDB, openDB } from 'idb';
import { CardEntry } from '@models/card.model';
import { Deck } from '@models/deck.model';
import { StorageLocation } from '@models/storage-location.model';
import { migrateLocalStorageToIndexedDb } from './local-storage-migration';

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

export interface GrimorioDbSchema extends DBSchema {
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

const DB_NAME = 'grimorio';
const DB_VERSION = 1;

// Memoized so every caller (all three entity services, on construction)
// shares one openDB() call and one run of the localStorage migration,
// instead of racing three concurrent migrations.
let dbPromise: Promise<IDBPDatabase<GrimorioDbSchema>> | null = null;

export function getGrimorioDb(): Promise<IDBPDatabase<GrimorioDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<GrimorioDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('cards', { keyPath: 'id' });
        db.createObjectStore('locations', { keyPath: 'id' });
        db.createObjectStore('decks', { keyPath: 'id' });
        const tombstones = db.createObjectStore('tombstones', { keyPath: 'key' });
        tombstones.createIndex('by-entity', 'entity');
        db.createObjectStore('meta', { keyPath: 'key' });
      },
    }).then(async (db) => {
      await migrateLocalStorageToIndexedDb(db);
      return db;
    });
  }
  return dbPromise;
}

// Test-only: closes and deletes the database, and clears the memoized promise, so
// each spec starts from a clean slate. Not used by production code.
export async function resetGrimorioDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
  }
  dbPromise = null;
  await deleteDB(DB_NAME);
}

// Test-only: closes the current connection and clears the memoized promise, but
// keeps the underlying data — lets a test reopen the same database to exercise
// the "already migrated" fast path. Not used by production code.
export async function reopenGrimorioDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
  }
  dbPromise = null;
}

import { IDBPDatabase } from 'idb';
import { CardEntry } from '@models/card.model';
import { Deck } from '@models/deck.model';
import { StorageLocation } from '@models/storage-location.model';
import { Tombstone } from '@models/tombstone.model';
import { GrimorioDbSchema, TombstoneEntity } from './grimorio-db';

const MIGRATED_FLAG_KEY = 'localStorageMigrated';

const LOCAL_STORAGE_KEYS = {
  cards: 'grimorio.cards',
  cardTombstones: 'grimorio.cards.tombstones',
  locations: 'grimorio.locations',
  locationTombstones: 'grimorio.locations.tombstones',
  decks: 'grimorio.decks',
  lastSyncedAt: 'grimorio.lastSyncedAt',
} as const;

function readJson<T>(key: string): T | undefined {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Grimorio: failed to migrate localStorage key "${key}", skipping.`, e);
    return undefined;
  }
}

async function migrateEntityStore<T extends { id: string }>(
  db: IDBPDatabase<GrimorioDbSchema>,
  storeName: 'cards' | 'locations' | 'decks',
  key: string,
): Promise<void> {
  const items = readJson<T[]>(key);
  if (!items || items.length === 0) {
    return;
  }
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all([...items.map((item) => tx.store.put(item as never)), tx.done]);
}

async function migrateTombstones(
  db: IDBPDatabase<GrimorioDbSchema>,
  entity: TombstoneEntity,
  key: string,
): Promise<void> {
  const tombstones = readJson<Tombstone[]>(key);
  if (!tombstones || tombstones.length === 0) {
    return;
  }
  const tx = db.transaction('tombstones', 'readwrite');
  await Promise.all([
    ...tombstones.map((tombstone) =>
      tx.store.put({ key: `${entity}:${tombstone.id}`, entity, id: tombstone.id, deletedAt: tombstone.deletedAt }),
    ),
    tx.done,
  ]);
}

async function migrateLastSyncedAt(db: IDBPDatabase<GrimorioDbSchema>): Promise<void> {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.lastSyncedAt);
  if (!raw) {
    return;
  }
  await db.put('meta', { key: 'lastSyncedAt', value: raw });
}

// One-time, idempotent migration run as part of getGrimorioDb(). Every write is a
// put-by-id, so re-running it (e.g. if the process dies before the flag is set) is
// always safe. Old localStorage keys are only cleared once every store write above
// has resolved without throwing, so an existing user's data can never be silently
// dropped mid-migration.
export async function migrateLocalStorageToIndexedDb(db: IDBPDatabase<GrimorioDbSchema>): Promise<void> {
  const meta = await db.get('meta', MIGRATED_FLAG_KEY);
  if (meta?.value) {
    return;
  }

  await migrateEntityStore<CardEntry>(db, 'cards', LOCAL_STORAGE_KEYS.cards);
  await migrateEntityStore<StorageLocation>(db, 'locations', LOCAL_STORAGE_KEYS.locations);
  await migrateEntityStore<Deck>(db, 'decks', LOCAL_STORAGE_KEYS.decks);
  await migrateTombstones(db, 'cards', LOCAL_STORAGE_KEYS.cardTombstones);
  await migrateTombstones(db, 'locations', LOCAL_STORAGE_KEYS.locationTombstones);
  await migrateLastSyncedAt(db);

  await db.put('meta', { key: MIGRATED_FLAG_KEY, value: true });

  for (const key of Object.values(LOCAL_STORAGE_KEYS)) {
    localStorage.removeItem(key);
  }
}

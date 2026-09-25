import { Tombstone } from '@models/tombstone.model';
import { ProfileDb, TombstoneEntity, closeProfileDb, openProfileDb } from './profile-db';

type EntityStoreName = 'cards' | 'locations' | 'decks';

/** The profile database a read/write targets; `null` when no profile is active. */
export type DbHandle = Promise<ProfileDb> | null;

// Every accessor goes through the database bound to the active profile (R1). With no bound
// profile, reads come back empty and writes reject — so nothing is ever read from, or written
// into, a profile that isn't active.
let bound: { profileId: string; db: Promise<ProfileDb> } | null = null;

export async function setActiveProfileDb(profileId: string | null): Promise<void> {
  if (bound?.profileId === profileId) {
    return;
  }
  bound = profileId ? { profileId, db: openProfileDb(profileId) } : null;
  await closeProfileDb(profileId);
}

/**
 * The currently bound database. Writers capture this when they enqueue a write, so a write
 * queued for profile A can never land in profile B's database after a switch.
 */
export function currentDbHandle(): DbHandle {
  return bound?.db ?? null;
}

function requireDb(handle: DbHandle): Promise<ProfileDb> {
  return handle ?? Promise.reject(new Error('No active profile: owned data is unavailable.'));
}

export async function getAllFromStore<T>(storeName: EntityStoreName, handle = currentDbHandle()): Promise<T[]> {
  if (!handle) {
    return [];
  }
  const db = await handle;
  return db.getAll(storeName) as Promise<T[]>;
}

// Clears the store then bulk-puts items, in one readwrite transaction — matches
// today's semantics of rebuilding and persisting the whole array on every mutation.
export async function replaceStore<T>(storeName: EntityStoreName, items: T[], handle = currentDbHandle()): Promise<void> {
  const db = await requireDb(handle);
  const tx = db.transaction(storeName, 'readwrite');
  await tx.store.clear();
  await Promise.all([...items.map((item) => tx.store.put(item as never)), tx.done]);
}

export async function getTombstonesFor(entity: TombstoneEntity, handle = currentDbHandle()): Promise<Tombstone[]> {
  if (!handle) {
    return [];
  }
  const db = await handle;
  const records = await db.getAllFromIndex('tombstones', 'by-entity', entity);
  return records.map(({ id, deletedAt }) => ({ id, deletedAt }));
}

export async function putTombstone(entity: TombstoneEntity, tombstone: Tombstone, handle = currentDbHandle()): Promise<void> {
  const db = await requireDb(handle);
  await db.put('tombstones', { key: `${entity}:${tombstone.id}`, entity, id: tombstone.id, deletedAt: tombstone.deletedAt });
}

export async function clearTombstones(entity: TombstoneEntity, ids: string[], handle = currentDbHandle()): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const db = await requireDb(handle);
  const tx = db.transaction('tombstones', 'readwrite');
  await Promise.all([...ids.map((id) => tx.store.delete(`${entity}:${id}`)), tx.done]);
}

export async function getMeta<T>(key: string, handle = currentDbHandle()): Promise<T | undefined> {
  if (!handle) {
    return undefined;
  }
  const db = await handle;
  const record = await db.get('meta', key);
  return record?.value as T | undefined;
}

export async function setMeta<T>(key: string, value: T, handle = currentDbHandle()): Promise<void> {
  const db = await requireDb(handle);
  await db.put('meta', { key, value });
}

// Test-only: forgets the bound profile without touching any database.
export function unbindProfileDbForTests(): void {
  bound = null;
}

import { CardEntry } from '@models/card.model';
import { Collection } from '@models/collection.model';
import { Deck } from '@models/deck.model';
import { Tombstone } from '@models/tombstone.model';
import { ProfileDb, TombstoneEntity, TombstoneRecord, closeProfileDb, openProfileDb } from './profile-db';

export type EntityStoreName = 'cards' | 'collections' | 'decks';

/** One row-level write op, applied in order within a single `writeRows` transaction. */
export type RowOp =
  | { store: EntityStoreName; put: Collection | CardEntry | Deck }
  | { store: EntityStoreName; delete: string }
  | { store: 'tombstones'; put: TombstoneRecord };

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

// One readwrite transaction over the distinct stores the ops touch (research R2/R13): a
// `collections`/`cards`/`tombstones` delete-and-put set commits all-or-nothing, so a create-with-
// move, a delete or a sync repair never leaves the database half-written. An empty op list
// resolves without opening a transaction at all.
export async function writeRows(ops: RowOp[], handle = currentDbHandle()): Promise<void> {
  if (ops.length === 0) {
    return;
  }
  const db = await requireDb(handle);
  const stores = [...new Set(ops.map((op) => op.store))];
  const tx = db.transaction(stores, 'readwrite');
  try {
    for (const op of ops) {
      if ('put' in op) {
        await tx.objectStore(op.store).put(op.put as never);
      } else {
        await tx.objectStore(op.store).delete(op.delete);
      }
    }
    await tx.done;
  } catch (e) {
    // A put/delete can throw synchronously (e.g. a value missing its keyPath) without the
    // engine aborting the transaction on its own — abort it explicitly so every op commits or
    // none do, never a partial set of the earlier ones. `tx.done` then rejects on its own
    // 'abort' listener (idb); that rejection is reported here already, so it's silenced there.
    tx.done.catch(() => undefined);
    try {
      tx.abort();
    } catch {
      // Already inactive/aborted — nothing left to do.
    }
    throw e;
  }
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

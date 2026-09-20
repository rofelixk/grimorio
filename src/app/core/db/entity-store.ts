import { Tombstone } from '@models/tombstone.model';
import { getGrimorioDb, TombstoneEntity } from './grimorio-db';

type EntityStoreName = 'cards' | 'locations' | 'decks';

export async function getAllFromStore<T>(storeName: EntityStoreName): Promise<T[]> {
  const db = await getGrimorioDb();
  return db.getAll(storeName) as Promise<T[]>;
}

// Clears the store then bulk-puts items, in one readwrite transaction — matches
// today's semantics of rebuilding and persisting the whole array on every mutation.
export async function replaceStore<T>(storeName: EntityStoreName, items: T[]): Promise<void> {
  const db = await getGrimorioDb();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.store.clear();
  await Promise.all([...items.map((item) => tx.store.put(item as never)), tx.done]);
}

export async function getTombstonesFor(entity: TombstoneEntity): Promise<Tombstone[]> {
  const db = await getGrimorioDb();
  const records = await db.getAllFromIndex('tombstones', 'by-entity', entity);
  return records.map(({ id, deletedAt }) => ({ id, deletedAt }));
}

export async function putTombstone(entity: TombstoneEntity, tombstone: Tombstone): Promise<void> {
  const db = await getGrimorioDb();
  await db.put('tombstones', { key: `${entity}:${tombstone.id}`, entity, id: tombstone.id, deletedAt: tombstone.deletedAt });
}

export async function clearTombstones(entity: TombstoneEntity, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const db = await getGrimorioDb();
  const tx = db.transaction('tombstones', 'readwrite');
  await Promise.all([...ids.map((id) => tx.store.delete(`${entity}:${id}`)), tx.done]);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getGrimorioDb();
  const record = await db.get('meta', key);
  return record?.value as T | undefined;
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  const db = await getGrimorioDb();
  await db.put('meta', { key, value });
}

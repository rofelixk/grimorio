import { Tombstone } from '@models/tombstone.model';

export interface SyncEntity {
  id: string;
  updatedAt: string;
}

export interface SyncReconcileResult<T> {
  merged: T[];
  toUpsertRemote: T[];
  toDeleteRemoteIds: string[];
  tombstonesToClear: string[];
}

// Per-row last-write-wins reconciliation between a device's local rows and
// what's currently on Supabase for this user, using local tombstones (not a
// remote soft-delete column — the schema has none) to tell "never synced"
// apart from "deleted here since the last sync". See the sync plan for the
// full case analysis; this is a pure function so the trickiest correctness
// surface can be unit-tested without touching localStorage or Supabase.
export function reconcileEntities<T extends SyncEntity>(
  local: T[],
  remote: T[],
  tombstones: Tombstone[],
): SyncReconcileResult<T> {
  const localById = new Map(local.map((entity) => [entity.id, entity]));
  const remoteById = new Map(remote.map((entity) => [entity.id, entity]));
  const tombstoneById = new Map(tombstones.map((tombstone) => [tombstone.id, tombstone]));

  const ids = new Set([...localById.keys(), ...remoteById.keys(), ...tombstoneById.keys()]);

  const merged: T[] = [];
  const toUpsertRemote: T[] = [];
  const toDeleteRemoteIds: string[] = [];
  const tombstonesToClear: string[] = [];

  for (const id of ids) {
    const localEntity = localById.get(id);
    const remoteEntity = remoteById.get(id);
    const tombstone = tombstoneById.get(id);

    if (localEntity) {
      // A live local row always supersedes a stale tombstone for the same id.
      if (tombstone) {
        tombstonesToClear.push(id);
      }

      if (remoteEntity) {
        if (localEntity.updatedAt > remoteEntity.updatedAt) {
          merged.push(localEntity);
          toUpsertRemote.push(localEntity);
        } else {
          merged.push(remoteEntity);
        }
      } else {
        merged.push(localEntity);
        toUpsertRemote.push(localEntity);
      }
      continue;
    }

    if (remoteEntity) {
      if (!tombstone) {
        merged.push(remoteEntity);
      } else if (tombstone.deletedAt > remoteEntity.updatedAt) {
        toDeleteRemoteIds.push(id);
        tombstonesToClear.push(id);
      } else {
        // The remote edit is newer than this device's delete intent — the
        // delete is stale, so the row is resurrected locally instead.
        merged.push(remoteEntity);
        tombstonesToClear.push(id);
      }
      continue;
    }

    // Neither local nor remote has this id anymore — the delete has already
    // propagated everywhere, so the tombstone has nothing left to guard.
    if (tombstone) {
      tombstonesToClear.push(id);
    }
  }

  return { merged, toUpsertRemote, toDeleteRemoteIds, tombstonesToClear };
}

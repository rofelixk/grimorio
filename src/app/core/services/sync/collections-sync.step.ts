import { Injectable, inject } from '@angular/core';
import { repairCollectionTree } from '@utils/collection-tree.util';
import { reconcileEntities } from '@utils/sync-reconcile.util';
import { CollectionService } from '../collection.service';
import { deleteRows, fetchAll, upsertRows } from './sync-remote';
import { type CollectionRow, collectionFromRow, collectionToRow } from './sync-rows';
import type { SyncStepContext } from './sync-run';

// Collections: reconcile, then repair the tree (research R6) before anything uploads: orphans are
// dropped and duplicate sibling names renamed, so the cloud never keeps a tree this device can see
// as broken.
@Injectable({ providedIn: 'root' })
export class CollectionsSyncStep {
  private readonly collections = inject(CollectionService);

  async run(ctx: SyncStepContext): Promise<void> {
    const remoteRows = await fetchAll<CollectionRow>(
      () =>
        ctx.client
          .from('collections')
          .select('id, user_id, name, color, parent_id, updated_at', { count: 'exact' })
          .eq('user_id', ctx.userId),
      ctx,
    );
    const local = this.collections.collections();
    const tombstones = await this.collections.getTombstones();
    const result = reconcileEntities(local, remoteRows.map(collectionFromRow), tombstones);

    const remoteIds = new Set(remoteRows.map((row) => row.id));
    const repair = repairCollectionTree(result.merged, remoteIds, new Date().toISOString());
    const removedIds = new Set(repair.removedIds);

    const toUpsertRemote = result.toUpsertRemote.filter((collection) => !removedIds.has(collection.id));
    for (const renamed of repair.renamed) {
      const index = toUpsertRemote.findIndex((collection) => collection.id === renamed.id);
      if (index >= 0) {
        toUpsertRemote[index] = renamed;
      } else {
        toUpsertRemote.push(renamed);
      }
    }
    const toDeleteRemoteIds = [
      ...result.toDeleteRemoteIds,
      ...repair.removedIds.filter((id) => remoteIds.has(id)),
    ];

    await upsertRows(
      ctx,
      'collections',
      toUpsertRemote.map((collection) => collectionToRow(collection, ctx.userId)),
      'user_id,id',
    );
    await deleteRows(ctx, 'collections', toDeleteRemoteIds);

    ctx.ensureCurrent();
    this.collections.applySyncResult(repair.collections);
    await this.collections.clearTombstones(result.tombstonesToClear);
  }
}

import { Injectable, inject } from '@angular/core';
import { reconcileEntities } from '@utils/sync-reconcile.util';
import { CardService } from '../card.service';
import { deleteRows, fetchAll, upsertRows } from './sync-remote';
import { type CardEntryRow, cardFromRow, cardToRow } from './sync-rows';
import type { SyncStepContext } from './sync-run';

// Cards: reconcile per row, upload and delete what the account lacks, apply the merge.
@Injectable({ providedIn: 'root' })
export class CardsSyncStep {
  private readonly cards = inject(CardService);

  async run(ctx: SyncStepContext): Promise<void> {
    const remoteRows = await fetchAll<CardEntryRow>(
      () => ctx.client.from('card_entries').select('*', { count: 'exact' }).eq('user_id', ctx.userId),
      ctx,
    );
    const local = this.cards.cards();
    const tombstones = await this.cards.getTombstones();
    const result = reconcileEntities(local, remoteRows.map(cardFromRow), tombstones);

    await upsertRows(
      ctx,
      'card_entries',
      result.toUpsertRemote.map((card) => cardToRow(card, ctx.userId)),
      'user_id,id',
    );
    await deleteRows(ctx, 'card_entries', result.toDeleteRemoteIds);

    ctx.ensureCurrent();
    this.cards.applySyncResult(result.merged);
    await this.cards.clearTombstones(result.tombstonesToClear);
  }
}

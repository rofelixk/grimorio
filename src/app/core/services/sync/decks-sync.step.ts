import { Injectable, inject } from '@angular/core';
import { repairDeckNames } from '@utils/deck.util';
import { reconcileEntities } from '@utils/sync-reconcile.util';
import { DeckService } from '../deck.service';
import { deleteRows, fetchAll, upsertRows } from './sync-remote';
import { type DeckRow, deckFromRow, deckToRow } from './sync-rows';
import type { SyncStepContext } from './sync-run';

// Decks (spec 009): reconcile, then rename duplicate names (research R6) before uploading, so
// two devices never keep two same-named decks.
@Injectable({ providedIn: 'root' })
export class DecksSyncStep {
  private readonly decks = inject(DeckService);

  async run(ctx: SyncStepContext): Promise<void> {
    const remoteRows = await fetchAll<DeckRow>(
      () =>
        ctx.client.from('decks').select('id, user_id, name, format, updated_at', { count: 'exact' }).eq('user_id', ctx.userId),
      ctx,
    );
    const tombstones = await this.decks.getTombstones();
    const result = reconcileEntities(this.decks.decks(), remoteRows.map(deckFromRow), tombstones);
    const repair = repairDeckNames(result.merged, new Set(remoteRows.map((row) => row.id)), new Date().toISOString());

    const toUpsertRemote = [...result.toUpsertRemote];
    for (const renamed of repair.renamed) {
      const index = toUpsertRemote.findIndex((deck) => deck.id === renamed.id);
      if (index >= 0) {
        toUpsertRemote[index] = renamed;
      } else {
        toUpsertRemote.push(renamed);
      }
    }

    await upsertRows(
      ctx,
      'decks',
      toUpsertRemote.map((deck) => deckToRow(deck, ctx.userId)),
      'user_id,id',
    );
    await deleteRows(ctx, 'decks', result.toDeleteRemoteIds);

    ctx.ensureCurrent();
    this.decks.applySyncResult(repair.decks);
    await this.decks.clearTombstones(result.tombstonesToClear);
  }
}

import { Injectable, inject } from '@angular/core';
import type { PlanarSelection } from '@models/planar-selection.model';
import { reconcileEntities } from '@utils/sync-reconcile.util';
import { PlanarSelectionService } from '../planar-selection.service';
import type { SyncStepContext } from './sync-run';

interface PlanarSelectionRow {
  user_id: string;
  disabled_ids: string[];
  updated_at: string;
}

/** The one selection a profile has, as the single entity the reconciler compares. */
const PLANAR_SELECTION_ID = 'planar-selection';

// One row per account, last-write-wins on updatedAt; never deleted, so no tombstones (FR-021).
@Injectable({ providedIn: 'root' })
export class PlanarSelectionSyncStep {
  private readonly planarSelection = inject(PlanarSelectionService);

  async run(ctx: SyncStepContext): Promise<void> {
    await this.planarSelection.flush();
    const { data, error } = await ctx.client
      .from('planechase_selections')
      .select('user_id, disabled_ids, updated_at')
      .eq('user_id', ctx.userId)
      .abortSignal(ctx.signal);
    if (error) {
      throw error;
    }
    ctx.ensureCurrent();
    const local = this.planarSelection.selection();
    const row = (data as PlanarSelectionRow[])[0];
    // timestamptz comes back as "…+00:00"; ISO keeps the string comparison with the local stamp exact.
    const remote: PlanarSelection | null = row
      ? { disabledIds: row.disabled_ids, updatedAt: new Date(row.updated_at).toISOString() }
      : null;
    const asEntity = (selection: PlanarSelection | null) =>
      selection ? [{ id: PLANAR_SELECTION_ID, ...selection }] : [];
    const result = reconcileEntities(asEntity(local), asEntity(remote), []);

    if (local && result.toUpsertRemote.length > 0) {
      const { error: upsertError } = await ctx.client
        .from('planechase_selections')
        .upsert(
          { user_id: ctx.userId, disabled_ids: local.disabledIds, updated_at: local.updatedAt },
          { onConflict: 'user_id' },
        )
        .abortSignal(ctx.signal);
      if (upsertError) {
        throw upsertError;
      }
    } else if (remote && (!local || remote.updatedAt > local.updatedAt)) {
      ctx.ensureCurrent();
      this.planarSelection.applySyncResult(remote);
    }
  }
}

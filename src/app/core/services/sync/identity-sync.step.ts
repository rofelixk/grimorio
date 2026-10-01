import { Injectable, inject } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { reconcileIdentity } from '@utils/identity-sync.util';
import { identityOf } from '../cloud-auth.service';
import { ProfileStore } from '../profile-store.service';
import { Superseded, type SyncStepContext } from './sync-run';

// Colors are last-write-wins across devices; the label records the latest rename (FR-012a).
@Injectable({ providedIn: 'root' })
export class IdentitySyncStep {
  private readonly profiles = inject(ProfileStore);

  async run(ctx: SyncStepContext, profileId: string, user: User): Promise<void> {
    const local = this.profiles.byId(profileId);
    if (!local) {
      throw new Superseded();
    }
    const remote = identityOf(user);
    const result = reconcileIdentity(local, {
      colors: remote.colors,
      colorsAt: remote.colorsAt,
      labelAt: remote.labelAt,
    });
    if (result.write) {
      const { error } = await ctx.client.auth.updateUser({ data: result.write });
      if (error) {
        throw error;
      }
    }
    ctx.ensureCurrent();
    if (result.adoptColors) {
      await this.profiles.setColors(local.id, result.adoptColors.colors, result.adoptColors.at);
    }
  }
}

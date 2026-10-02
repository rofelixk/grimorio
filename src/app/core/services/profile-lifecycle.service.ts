import { Injectable, inject } from '@angular/core';
import { deleteProfileDb } from '../db/profile-db';
import { Failure } from '../utils/cloud-error.util';
import { CardViewModeService } from './card-view-mode.service';
import { MSG } from '../utils/entry-copy';
import { CloudSessionService } from './cloud-session.service';
import { ConnectivityService } from './connectivity.service';
import { ProfileSessionService } from './profile-session.service';
import { ProfileStore } from './profile-store.service';

// Deleting a local profile (FR-017, FR-018, research R9). Works offline and never touches the
// linked account or its cloud data. One database per profile makes the deletion a deleteDB, so
// the other profiles are untouched by construction (SC-004).
@Injectable({ providedIn: 'root' })
export class ProfileLifecycleService {
  private readonly profiles = inject(ProfileStore);
  private readonly session = inject(ProfileSessionService);
  private readonly cloud = inject(CloudSessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly viewMode = inject(CardViewModeService);

  /**
   * Verify → sign out → cloud cleanup → delete the database → drop the record. Throws the
   * `MSG.wrongLocal` field failure on a wrong password, deleting nothing. Resolves with the
   * number of profiles left on the device.
   */
  async deleteProfile(id: string, password: string): Promise<number> {
    if (!(await this.profiles.verifyPassword(id, password))) {
      throw { kind: 'field', field: 'pw', message: MSG.wrongLocal } satisfies Failure;
    }
    const linked = !!this.profiles.byId(id)?.cloud;
    // Signing out first means no entity service holds the database open when it is deleted.
    await this.session.signOut();
    if (linked) {
      await this.cloud.whileUnlinking(id, async () => {
        const client = this.cloud.client(id);
        this.cloud.stopAutoRefresh(id);
        if (this.connectivity.online()) {
          await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
        }
        this.cloud.removeSession(id);
      });
    }
    await deleteProfileDb(id);
    this.viewMode.forget(id);
    await this.profiles.remove(id);
    return this.profiles.profiles().length;
  }
}

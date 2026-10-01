import { Injectable, inject, signal } from '@angular/core';
import { type TakeoverEvent, onTakeover } from '@db/connection-events';
import { DATA } from '@utils/entry-copy';
import { ProfileSessionService } from './profile-session.service';
import { ProfileStore } from './profile-store.service';
import { ToastService } from './toast.service';

// Reacts when another copy of the app takes over a database this copy holds (research R4). A newer
// version mounts the reload prompt for good (FR-009); a deletion of the open profile tells the
// person, then signs out (FR-010). A deletion of any other profile is ignored.
@Injectable({ providedIn: 'root' })
export class StorageHealthService {
  private readonly session = inject(ProfileSessionService);
  private readonly toast = inject(ToastService);
  private readonly store = inject(ProfileStore);

  private readonly reloadRequiredSignal = signal(false);
  /** True after another copy opened a newer DB version; mounts ReloadPrompt (FR-009). */
  readonly reloadRequired = this.reloadRequiredSignal.asReadonly();

  private started = false;

  /** Subscribes to takeovers once. Called from App's constructor. */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    onTakeover((event) => this.handle(event));
  }

  private handle(event: TakeoverEvent): void {
    if (event.kind === 'upgrade') {
      this.reloadRequiredSignal.set(true);
      return;
    }
    if (event.profileId !== this.session.active()?.id) {
      return;
    }
    // Toast first (ui.md §4): the entry modal then re-hosts it when the gated route opens it.
    this.toast.show(DATA.deletedElsewhere.label, DATA.deletedElsewhere.text);
    // Signed out, the deleted profile is no longer this copy's open one, so the re-read drops it.
    void this.session
      .signOut()
      .then(() => this.store.refresh())
      .catch((error: unknown) => console.error('Grimorio: failed to leave a deleted profile.', error));
  }
}

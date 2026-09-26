import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { SyncDisplay, syncDisplay } from '../utils/sync-status.util';
import { EntryModalService } from './entry-modal.service';
import { ProfileSessionService } from './profile-session.service';
import { SyncService } from './sync.service';

const CLOCK_MS = 60_000;

// What the shell shows for the active profile's sync (FR-007 to FR-009), and the one place that
// starts a sync (SC-011). The display re-derives on state or profile change and every minute.
@Injectable({ providedIn: 'root' })
export class SyncStatusService {
  private readonly session = inject(ProfileSessionService);
  private readonly sync = inject(SyncService);
  private readonly entryModal = inject(EntryModalService);

  private readonly now = signal(Date.now());

  /** null when no profile is active (FR-009). */
  readonly display = computed<SyncDisplay | null>(() => {
    const active = this.session.active();
    if (!active) {
      return null;
    }
    return syncDisplay({
      linked: !!active.cloud,
      state: this.sync.state(),
      lastSyncedAt: this.sync.lastSyncedAt(),
      now: this.now(),
    });
  });

  /** True while a sync runs: locks the profile control and the sync area (FR-005a, FR-008). */
  readonly busy = computed(() => this.sync.state() === 'syncing');

  constructor() {
    const clock = setInterval(() => this.now.set(Date.now()), CLOCK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(clock));
  }

  /** Performs the displayed action. A no-op while a sync runs. */
  act(): void {
    if (this.busy()) {
      return;
    }
    switch (this.display()?.action) {
      case 'sync':
      case 'retry':
        void this.sync.syncNow();
        return;
      case 'link':
        void this.entryModal.open({ context: 'link', start: 'in' });
        return;
      case 'reauth':
        void this.entryModal.open({ context: 'link', start: 'reauth' });
        return;
    }
  }
}

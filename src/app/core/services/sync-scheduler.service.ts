import { DestroyRef, Injectable, computed, effect, inject, untracked } from '@angular/core';
import { ProfileSummary } from '@models/profile.model';
import { CardService } from './card.service';
import { CloudSessionService } from './cloud-session.service';
import { ConnectivityService } from './connectivity.service';
import { DeckService } from './deck.service';
import { ProfileSessionService } from './profile-session.service';
import { StorageLocationService } from './storage-location.service';
import { SyncService } from './sync.service';

/** Quiet period after the last local change before syncing. */
export const SYNC_DEBOUNCE_MS = 15_000;
/** Longest a change waits under continuous edits — leaves time for the sync itself to land
 * within the 1-minute requirement (US4-10). */
export const SYNC_MAX_WAIT_MS = 45_000;

// When sync runs (R11, FR-016a): within a minute of a local change while online, again when the
// connection comes back with changes pending, and on every switch into a linked profile. It
// also keeps only the active profile's cloud session refreshing (data-model "Entering
// active(P)" steps 1, 5, 6). Link, setup, unlock and reauth call SyncService.syncNow() directly.
@Injectable({ providedIn: 'root' })
export class SyncScheduler {
  private readonly session = inject(ProfileSessionService);
  private readonly cloud = inject(CloudSessionService);
  private readonly sync = inject(SyncService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly cards = inject(CardService);
  private readonly locations = inject(StorageLocationService);
  private readonly decks = inject(DeckService);

  private readonly changes = computed(
    () => this.cards.changeCount() + this.locations.changeCount() + this.decks.changeCount(),
  );
  private syncedChanges = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  constructor() {
    effect(() => {
      const changes = this.changes();
      untracked(() => {
        if (changes > this.syncedChanges) {
          this.schedule();
        }
      });
    });

    effect(() => {
      if (this.connectivity.online()) {
        untracked(() => {
          if (this.hasPendingChanges()) {
            this.trigger();
          }
        });
      }
    });

    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.session.registerHooks({
      beforeSwitch: (previous) => this.beforeSwitch(previous),
      afterActivate: (active) => this.afterActivate(active),
    });
  }

  private beforeSwitch(previous: ProfileSummary | null): void {
    this.clearTimers();
    if (previous?.cloud) {
      this.cloud.stopAutoRefresh(previous.id);
    }
  }

  private afterActivate(active: ProfileSummary | null): void {
    // Changes made before the switch belonged to the previous profile.
    this.syncedChanges = untracked(this.changes);
    void this.sync.profileChanged();
    if (active?.cloud && !active.cloud.needsReauth) {
      this.cloud.startAutoRefresh(active.id);
      void this.sync.syncNow();
    }
  }

  private canSync(): boolean {
    const cloud = this.session.active()?.cloud;
    return !!cloud && !cloud.needsReauth && this.connectivity.online();
  }

  private hasPendingChanges(): boolean {
    return untracked(this.changes) > this.syncedChanges;
  }

  private schedule(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => this.trigger(), SYNC_DEBOUNCE_MS);
    this.maxWaitTimer ??= setTimeout(() => this.trigger(), SYNC_MAX_WAIT_MS);
  }

  private trigger(): void {
    this.clearTimers();
    if (!this.canSync() || !this.hasPendingChanges()) {
      return;
    }
    const upTo = untracked(this.changes);
    void this.sync.syncNow().then((outcome) => {
      if (outcome === 'done') {
        this.syncedChanges = Math.max(this.syncedChanges, upTo);
      }
    });
  }

  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
    }
    this.debounceTimer = null;
    this.maxWaitTimer = null;
  }
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { currentDbHandle, getMeta, setMeta } from '../db/entity-store';
import { isAuthSessionError, isNetworkError } from '../utils/cloud-error.util';
import { CardService } from './card.service';
import { CloudAuthService } from './cloud-auth.service';
import { CloudSessionService } from './cloud-session.service';
import { CollectionService } from './collection.service';
import { ConnectivityService } from './connectivity.service';
import { DeckService } from './deck.service';
import { ProfileSessionService } from './profile-session.service';
import { CardsSyncStep } from './sync/cards-sync.step';
import { CollectionsSyncStep } from './sync/collections-sync.step';
import { DecksSyncStep } from './sync/decks-sync.step';
import { IdentitySyncStep } from './sync/identity-sync.step';
import { PlanarSelectionSyncStep } from './sync/planar-selection-sync.step';
import { SYNC_LOCK } from './sync/sync-lock';
import { AuthExpired, Offline, type Run, Superseded, type SyncStepContext } from './sync/sync-run';

export type SyncState = 'idle' | 'syncing' | 'done' | 'offline' | 'reauth' | 'error';
/**
 * How a syncNow() call ended; 'skipped' = nothing to sync (unlinked, or the profile changed);
 * 'gone' = the account no longer exists, so the profile turned local-only (FR-019b).
 */
export type SyncOutcome = 'done' | 'offline' | 'reauth' | 'error' | 'skipped' | 'gone';
/** A sync run always settles within this bound (FR-005a); a hung request ends as a failure. */
export const SYNC_TIMEOUT_MS = 60_000;

const LAST_SYNCED_KEY = 'lastSyncedAt';

// Syncs the active profile's identity, collections, decks, cards and planar deck selection with
// its linked account (R11), reusing the per-item last-write-wins reconciler. Each run first asks
// GoTrue about the account (spec 005 R12): a deleted one turns the profile local-only, a dead
// session asks for "Entrar de novo", and otherwise the steps under `sync/` run in order (spec 011
// R8). Sync is manual only: nothing but syncNow() starts one, and only SyncStatusService calls it
// (spec 004, SC-011). Single-flight, one copy of the app at a time (SYNC_LOCK) and bounded by
// SYNC_TIMEOUT_MS; a run that was switched away from or timed out never writes state or applies
// its results.
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly session = inject(ProfileSessionService);
  private readonly cloud = inject(CloudSessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly cards = inject(CardService);
  private readonly collections = inject(CollectionService);
  private readonly decks = inject(DeckService);
  private readonly cloudAuth = inject(CloudAuthService);
  private readonly lock = inject(SYNC_LOCK);
  private readonly identityStep = inject(IdentitySyncStep);
  private readonly collectionsStep = inject(CollectionsSyncStep);
  private readonly decksStep = inject(DecksSyncStep);
  private readonly cardsStep = inject(CardsSyncStep);
  private readonly planarSelectionStep = inject(PlanarSelectionSyncStep);

  private readonly stateSignal = signal<SyncState>('idle');
  /**
   * The profile's `needsReauth` flag decides 'reauth': a dead session shows as expired as soon as
   * it's detected, and any re-sign-in (reauth, reset code, recover) clears it without a sync.
   */
  readonly state = computed<SyncState>(() => {
    if (this.session.active()?.cloud?.needsReauth) {
      return 'reauth';
    }
    const state = this.stateSignal();
    return state === 'reauth' ? 'idle' : state;
  });
  private readonly lastSyncedAtSignal = signal<string | null>(null);
  readonly lastSyncedAt = this.lastSyncedAtSignal.asReadonly();

  private inFlight: Promise<SyncOutcome> | null = null;
  private generation = 0;
  private started = false;

  /**
   * Registers the session hooks once (called from App): a switch stops the previous profile's
   * auth auto-refresh; an activation resets the status and keeps the new linked profile's
   * session refreshing. Never syncs.
   */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.session.registerHooks({
      beforeSwitch: (previous) => {
        if (previous?.cloud) {
          this.cloud.stopAutoRefresh(previous.id);
        }
      },
      afterActivate: (active) => {
        void this.profileChanged();
        if (active?.cloud && !active.cloud.needsReauth) {
          this.cloud.startAutoRefresh(active.id);
        }
      },
    });
  }

  /** Resets the status for a newly active profile and loads its last sync time. */
  async profileChanged(): Promise<void> {
    this.stateSignal.set('idle');
    this.lastSyncedAtSignal.set(null);
    const profileId = this.session.active()?.id ?? null;
    const lastSyncedAt = profileId ? await getMeta<string>(LAST_SYNCED_KEY) : undefined;
    if (profileId && this.session.active()?.id === profileId) {
      this.lastSyncedAtSignal.set(lastSyncedAt ?? null);
    }
  }

  syncNow(): Promise<SyncOutcome> {
    this.inFlight ??= this.run().finally(() => (this.inFlight = null));
    return this.inFlight;
  }

  private async run(): Promise<SyncOutcome> {
    const profile = this.session.active();
    if (!profile?.cloud) {
      return 'skipped';
    }
    if (profile.cloud.needsReauth) {
      this.stateSignal.set('reauth');
      return 'reauth';
    }
    if (!this.connectivity.online()) {
      this.stateSignal.set('offline');
      return 'offline';
    }

    // 'syncing' shows while this copy waits for another copy's sync to end (FR-014a).
    this.stateSignal.set('syncing');
    const run: Run = { profile, generation: ++this.generation, abort: new AbortController() };
    return this.lock(() => (this.isCurrent(run) ? this.timedExchange(run) : Promise.resolve('skipped' as const)));
  }

  // The bound starts once the lock is held; the lock is released when the race settles.
  private async timedExchange(run: Run): Promise<SyncOutcome> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), SYNC_TIMEOUT_MS);
    });
    try {
      const outcome = await Promise.race([this.exchange(run), timedOut]);
      if (outcome !== 'timeout') {
        return outcome;
      }
      // Disown the run and cancel its requests, so nothing it does afterwards lands.
      this.generation++;
      run.abort.abort();
      const state = this.connectivity.online() ? 'error' : 'offline';
      if (this.session.active()?.id === run.profile.id) {
        this.stateSignal.set(state);
      }
      return state;
    } finally {
      clearTimeout(timer);
    }
  }

  private async exchange(run: Run): Promise<SyncOutcome> {
    const { profile } = run;
    const handle = currentDbHandle();
    try {
      const account = await this.cloudAuth.lookupAccount(profile.id);
      this.ensureCurrent(run);
      switch (account.status) {
        case 'gone':
          await this.cloudAuth.forgetGoneAccount(profile.id);
          this.setStateIfCurrent(run, 'idle');
          return 'gone';
        case 'expired':
          throw new AuthExpired();
        case 'offline':
          throw new Offline();
        case 'error':
          throw account.error;
      }
      const ctx: SyncStepContext = {
        client: this.cloud.client(profile.id),
        userId: profile.cloud!.userId,
        signal: run.abort.signal,
        ensureCurrent: () => this.ensureCurrent(run),
      };
      await this.identityStep.run(ctx, profile.id, account.user);
      await Promise.all([this.collections.flush(), this.decks.flush(), this.cards.flush()]);
      await this.collectionsStep.run(ctx);
      await this.decksStep.run(ctx);
      await this.cardsStep.run(ctx);

      // Captured here (contracts/services.md): the FR-029 fix-up below stamps its moved cards
      // with a fresh updatedAt, strictly after this, so hasUnsyncedChanges sees them and the next
      // sync uploads them.
      const syncedAt = new Date().toISOString();
      this.ensureCurrent(run);
      this.collections.resolveMixedCollections(syncedAt);
      await this.planarSelectionStep.run(ctx);

      this.ensureCurrent(run);
      await setMeta(LAST_SYNCED_KEY, syncedAt, handle);
      this.ensureCurrent(run);
      this.lastSyncedAtSignal.set(syncedAt);
      this.stateSignal.set('done');
      return 'done';
    } catch (error) {
      if (error instanceof Superseded || !this.isCurrent(run)) {
        return 'skipped';
      }
      if (error instanceof AuthExpired || isAuthSessionError(error)) {
        await this.cloud.markNeedsReauth(profile.id);
        this.setStateIfCurrent(run, 'reauth');
        return 'reauth';
      }
      if (error instanceof Offline || !this.connectivity.online() || isNetworkError(error)) {
        this.setStateIfCurrent(run, 'offline');
        return 'offline';
      }
      this.setStateIfCurrent(run, 'error');
      return 'error';
    }
  }

  private isCurrent(run: Run): boolean {
    return run.generation === this.generation && this.session.active()?.id === run.profile.id;
  }

  private ensureCurrent(run: Run): void {
    if (!this.isCurrent(run)) {
      throw new Superseded();
    }
  }

  private setStateIfCurrent(run: Run, state: SyncState): void {
    if (this.isCurrent(run)) {
      this.stateSignal.set(state);
    }
  }
}

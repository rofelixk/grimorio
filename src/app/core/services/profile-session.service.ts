import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileSummary } from '@models/profile.model';
import { getDeviceDb } from '../db/device-db';
import { CardService } from './card.service';
import { DeckService } from './deck.service';
import { ProfileStore } from './profile-store.service';
import { StorageLocationService } from './storage-location.service';

const ACTIVE_PROFILE_KEY = 'activeProfileId';

/**
 * Cloud side of a profile switch (data-model "Entering active(P)" steps 1, 5, 6), registered
 * by the cloud services so this service doesn't depend on them.
 */
export interface SessionHooks {
  /** Step 1: stop keeping the previous profile's cloud session alive. */
  beforeSwitch(previous: ProfileSummary | null): void;
  /** Steps 5–6: keep the new profile's cloud session alive and sync it. */
  afterActivate(active: ProfileSummary | null): void;
}

// Which local profile is active (FR-006, FR-007). Owns the switch sequence so the entity
// services always point at the active profile's database, or at none.
@Injectable({ providedIn: 'root' })
export class ProfileSessionService {
  private readonly store = inject(ProfileStore);
  private readonly router = inject(Router);
  private readonly entityServices = [
    inject(CardService),
    inject(StorageLocationService),
    inject(DeckService),
  ] as const;

  private readonly activeId = signal<string | null>(null);
  /** The active profile, kept current as its colors or cloud link change. */
  readonly active = computed<ProfileSummary | null>(() => this.store.byId(this.activeId()) ?? null);

  private readonly hooks: SessionHooks[] = [];
  private readyPromise: Promise<void> | null = null;
  private ready = false;
  // Serializes switches so two quick activate()/signOut() calls can't interleave loads.
  private queue: Promise<unknown> = Promise.resolve();

  // Hooks registered after startup still see the restored profile activate.
  registerHooks(hooks: SessionHooks): void {
    this.hooks.push(hooks);
    if (this.ready) {
      hooks.afterActivate(this.active());
    }
  }

  // Restores the profile that was active when the app last closed (US1-5), with no password.
  whenReady(): Promise<void> {
    this.readyPromise ??= (async () => {
      await this.store.whenReady();
      const db = await getDeviceDb();
      const saved = (await db.get('meta', ACTIVE_PROFILE_KEY))?.value as string | null | undefined;
      const id = saved && this.store.byId(saved) ? saved : null;
      await this.loadEntities(id);
      this.activeId.set(id);
      this.ready = true;
      this.runAfterActivate();
    })();
    return this.readyPromise;
  }

  activate(id: string): Promise<void> {
    return this.enqueue(() => this.switchTo(id));
  }

  signOut(): Promise<void> {
    return this.enqueue(() => this.switchTo(null));
  }

  private enqueue(fn: () => Promise<void>): Promise<void> {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async switchTo(id: string | null): Promise<void> {
    for (const hooks of this.hooks) {
      hooks.beforeSwitch(this.active());
    }
    // Clear the active profile first so its identity and data are hidden before anything awaits.
    this.activeId.set(null);
    await this.loadEntities(id);
    this.activeId.set(id);
    const db = await getDeviceDb();
    await db.put('meta', { key: ACTIVE_PROFILE_KEY, value: id });
    this.runAfterActivate();
    this.reguardCurrentRoute();
  }

  private async loadEntities(id: string | null): Promise<void> {
    // Every pending write lands in the old profile's database before any service rebinds.
    await Promise.all(this.entityServices.map((service) => service.flush()));
    await Promise.all(this.entityServices.map((service) => service.load(id)));
  }

  private runAfterActivate(): void {
    for (const hooks of this.hooks) {
      hooks.afterActivate(this.active());
    }
  }

  // Re-runs the current route's guards (R12), so signing out on a gated page lands on Home.
  // Skipped while a navigation is in flight — that navigation's own guard is deciding.
  private reguardCurrentRoute(): void {
    if (this.router.currentNavigation() || !this.router.navigated) {
      return;
    }
    void this.router.navigateByUrl(this.router.url, {
      onSameUrlNavigation: 'reload',
      info: { sessionChange: true },
    });
  }
}

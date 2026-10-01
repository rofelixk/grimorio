import { Injectable, inject, signal } from '@angular/core';
import type { PlanarSelection } from '@models/planar-selection.model';
import { getDeviceDb } from '../db/device-db';
import { DbHandle, currentDbHandle, getMeta, setActiveProfileDb, setMeta } from '../db/entity-store';
import { CrossTabService } from './cross-tab.service';
import { SaveQueueService } from './save-queue.service';

/** The `meta` key holding a selection, in a profile DB or (with no profile) the device DB (R5). */
const SELECTION_KEY = 'planarSelection';

/** Where a selection lives: the active profile's database, or the device's with no profile. */
type Target = { kind: 'device' } | { kind: 'profile'; profileId: string; handle: DbHandle };

async function read(target: Target): Promise<PlanarSelection | null> {
  if (target.kind === 'profile') {
    return (await getMeta<PlanarSelection>(SELECTION_KEY, target.handle)) ?? null;
  }
  const db = await getDeviceDb();
  return ((await db.get('meta', SELECTION_KEY))?.value as PlanarSelection | undefined) ?? null;
}

async function write(target: Target, selection: PlanarSelection): Promise<void> {
  if (target.kind === 'profile') {
    await setMeta(SELECTION_KEY, selection, target.handle);
    return;
  }
  const db = await getDeviceDb();
  await db.put('meta', { key: SELECTION_KEY, value: selection });
}

// The planar deck selection (FR-017–FR-021), following the entity-service shape (R6): it joins the
// profile switch sequence, so it always belongs to the active profile, or to the device when no
// profile is active. `null` means never saved: the default list applies (spec 007 FR-017).
@Injectable({ providedIn: 'root' })
export class PlanarSelectionService {
  private readonly selectionSignal = signal<PlanarSelection | null>(null);
  readonly selection = this.selectionSignal.asReadonly();

  private target: Target = { kind: 'device' };
  private readyPromise: Promise<void> = Promise.resolve();
  private loadGeneration = 0;
  private readonly queue = inject(SaveQueueService).create('the planar deck selection');
  private readonly crossTab = inject(CrossTabService);

  constructor() {
    this.crossTab.on('planarSelection', () => this.refresh());
  }

  // Clears the signal synchronously, so another profile's selection is never visible; pending
  // writes still land where they were queued.
  load(profileId: string | null): Promise<void> {
    const generation = ++this.loadGeneration;
    this.selectionSignal.set(null);
    this.readyPromise = (async () => {
      await this.flush();
      await setActiveProfileDb(profileId);
      const target: Target = profileId
        ? { kind: 'profile', profileId, handle: currentDbHandle() }
        : { kind: 'device' };
      const selection = await read(target);
      if (generation === this.loadGeneration) {
        this.target = target;
        this.selectionSignal.set(selection);
      }
    })();
    return this.readyPromise;
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  flush(): Promise<void> {
    return this.queue.flush();
  }

  // Re-reads the current target's selection after another copy saved it (research R5). Never
  // clears the signal first and never writes; loses to a newer load(), and reads again if a
  // change made here lands meanwhile.
  async refresh(): Promise<void> {
    const generation = this.loadGeneration;
    const target = this.target;
    const before = this.selectionSignal();
    await this.flush();
    const selection = await read(target);
    if (generation !== this.loadGeneration || target !== this.target) {
      return;
    }
    if (this.selectionSignal() !== before) {
      return this.refresh();
    }
    this.selectionSignal.set(selection);
  }

  /** Saves a new selection, stamped now (FR-020). */
  save(disabledIds: string[]): void {
    this.store({ disabledIds: [...disabledIds], updatedAt: new Date().toISOString() });
  }

  /** Sync-only: stores the reconciled selection as is, without restamping. */
  applySyncResult(selection: PlanarSelection): void {
    this.store(selection);
  }

  private store(selection: PlanarSelection): void {
    this.selectionSignal.set(selection);
    const target = this.target;
    const profileId = target.kind === 'profile' ? target.profileId : null;
    this.queue.enqueue(
      () => write(target, selection),
      () => this.crossTab.announce('planarSelection', profileId),
    );
  }
}

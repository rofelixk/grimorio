import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { CloudLink, Color, ProfileRecord, ProfileSummary } from '@models/profile.model';
import { ACTIVE_PROFILE_KEY, getDeviceDb } from '../db/device-db';
import { boundProfileId } from '../db/entity-store';
import { WriteQueue } from '../db/write-queue';
import { hashPassword, verifyPassword } from '../utils/password-hash.util';
import { CrossTabService } from './cross-tab.service';
import { StoragePersistenceService } from './storage-persistence.service';

/** PBKDF2 iteration count for new password hashes (R3); tests provide a small value. */
export const PBKDF2_ITERATIONS = new InjectionToken<number>('PBKDF2_ITERATIONS', {
  providedIn: 'root',
  factory: () => 600_000,
});

function toSummary(record: ProfileRecord): ProfileSummary {
  const { id, name, nameUpdatedAt, colors, colorsUpdatedAt, cloud, createdAt } = record;
  return { id, name, nameUpdatedAt, colors, colorsUpdatedAt, cloud, createdAt };
}

function byCreatedAt(a: ProfileRecord, b: ProfileRecord): number {
  return a.createdAt.localeCompare(b.createdAt);
}

// The device registry of local profiles (`grimorio-device`), following the persistence
// pattern (Principle VI): signal state hydrated from IndexedDB, whenReady()/flush(), and a
// serialized write queue. Password hashes never leave this service (FR-009).
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly iterations = inject(PBKDF2_ITERATIONS);

  private readonly records = signal<ProfileRecord[]>([]);
  private readonly profilesSignal = signal<ProfileSummary[]>([]);
  /** Every profile on the device, oldest first, without password hashes. */
  readonly profiles = this.profilesSignal.asReadonly();

  private readonly readyPromise: Promise<void>;
  // Unlike the entity services, a failed registry write is surfaced to the caller (run(), no
  // reporter): a profile that silently fails to save would vanish on the next launch.
  private readonly queue = new WriteQueue();
  private readonly crossTab = inject(CrossTabService);
  private readonly persistence = inject(StoragePersistenceService);

  constructor() {
    this.readyPromise = this.hydrate();
    this.crossTab.on('profiles', () => this.refresh());
  }

  /**
   * Re-reads the registry after another copy changed it (research R5). The profile this copy has
   * open stays listed even if the other copy deleted it: the `deleted` takeover signs out
   * (StorageHealthService), which is the only way to the no-profile state.
   */
  async refresh(): Promise<void> {
    const before = this.records();
    await this.flush();
    const db = await getDeviceDb();
    const records = await db.getAll('profiles');
    if (this.records() !== before) {
      return this.refresh();
    }
    const openId = boundProfileId();
    const open = records.some((r) => r.id === openId) ? undefined : before.find((r) => r.id === openId);
    this.setRecords(open ? [...records, open] : records);
  }

  private async hydrate(): Promise<void> {
    const db = await getDeviceDb();
    this.setRecords(await db.getAll('profiles'));
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  flush(): Promise<void> {
    return this.queue.flush();
  }

  private setRecords(records: ProfileRecord[]): void {
    const sorted = [...records].sort(byCreatedAt);
    this.records.set(sorted);
    this.profilesSignal.set(sorted.map(toSummary));
  }

  private persist(record: ProfileRecord): Promise<void> {
    return this.write(async () => {
      const db = await getDeviceDb();
      await db.put('profiles', record);
    });
  }

  // Every registry write: caller-reported, and announced to other copies once it lands.
  private async write(task: () => Promise<void>): Promise<void> {
    await this.queue.run(task);
    this.crossTab.announce('profiles', null);
  }

  private record(id: string): ProfileRecord {
    const found = this.records().find((r) => r.id === id);
    if (!found) {
      throw new Error(`Unknown profile ${id}`);
    }
    return found;
  }

  private async patch(id: string, patch: Partial<ProfileRecord>): Promise<void> {
    const next = { ...this.record(id), ...patch };
    this.setRecords(this.records().map((r) => (r.id === id ? next : r)));
    await this.persist(next);
  }

  byId(id: string | null | undefined): ProfileSummary | undefined {
    return id ? this.profiles().find((p) => p.id === id) : undefined;
  }

  /** Names are unique per device, compared trimmed and case-insensitively (FR-003). */
  isNameTaken(name: string, exceptId?: string): boolean {
    const wanted = name.trim().toLowerCase();
    return this.profiles().some((p) => p.id !== exceptId && p.name.toLowerCase() === wanted);
  }

  async create(input: { name: string; password: string; colors: Color[] }): Promise<ProfileSummary> {
    const password = await hashPassword(input.password, this.iterations);
    const createdAt = this.nextCreatedAt();
    const record: ProfileRecord = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      nameUpdatedAt: createdAt,
      colors: [...input.colors],
      colorsUpdatedAt: createdAt,
      password,
      cloud: null,
      createdAt,
    };
    this.setRecords([...this.records(), record]);
    await this.persist(record);
    void this.persistence.request('created');
    return toSummary(record);
  }

  // Strictly after every existing profile, so list order is stable even for two profiles
  // created within the same millisecond.
  private nextCreatedAt(): string {
    const last = this.records().at(-1);
    const after = last ? Date.parse(last.createdAt) + 1 : 0;
    return new Date(Math.max(Date.now(), after)).toISOString();
  }

  verifyPassword(id: string, password: string): Promise<boolean> {
    return verifyPassword(password, this.record(id).password);
  }

  async setPassword(id: string, password: string): Promise<void> {
    await this.patch(id, { password: await hashPassword(password, this.iterations) });
  }

  /** Renames a profile (FR-009); the caller validates the name first. */
  rename(id: string, name: string): Promise<void> {
    return this.patch(id, { name: name.trim(), nameUpdatedAt: new Date().toISOString() });
  }

  /** `at` keeps an adopted account change's own timestamp (R6); otherwise the change is now. */
  setColors(id: string, colors: Color[], at?: string): Promise<void> {
    return this.patch(id, { colors: [...colors], colorsUpdatedAt: at ?? new Date().toISOString() });
  }

  /** Drops the registry record (FR-017). If it was the active profile, none is active afterwards. */
  async remove(id: string): Promise<void> {
    this.setRecords(this.records().filter((r) => r.id !== id));
    await this.write(async () => {
      const db = await getDeviceDb();
      const tx = db.transaction(['profiles', 'meta'], 'readwrite');
      await tx.objectStore('profiles').delete(id);
      const meta = tx.objectStore('meta');
      if ((await meta.get(ACTIVE_PROFILE_KEY))?.value === id) {
        await meta.put({ key: ACTIVE_PROFILE_KEY, value: null });
      }
      await tx.done;
    });
  }

  setCloud(id: string, link: CloudLink | null): Promise<void> {
    return this.patch(id, { cloud: link });
  }

  /** The profile on this device already linked to a cloud account, if any (FR-033). */
  findByCloudUser(userId: string): ProfileSummary | undefined {
    return this.profiles().find((p) => p.cloud?.userId === userId);
  }
}

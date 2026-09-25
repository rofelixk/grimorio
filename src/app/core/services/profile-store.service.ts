import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { CloudLink, Color, ProfileRecord, ProfileSummary } from '@models/profile.model';
import { getDeviceDb } from '../db/device-db';
import { hashPassword, verifyPassword } from '../utils/password-hash.util';

/** PBKDF2 iteration count for new password hashes (R3); tests provide a small value. */
export const PBKDF2_ITERATIONS = new InjectionToken<number>('PBKDF2_ITERATIONS', {
  providedIn: 'root',
  factory: () => 600_000,
});

function toSummary(record: ProfileRecord): ProfileSummary {
  const { id, name, colors, cloud, createdAt } = record;
  return { id, name, colors, cloud, createdAt };
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
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.readyPromise = this.hydrate();
  }

  private async hydrate(): Promise<void> {
    const db = await getDeviceDb();
    this.setRecords(await db.getAll('profiles'));
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  flush(): Promise<void> {
    return this.writeQueue.then(() => undefined);
  }

  private setRecords(records: ProfileRecord[]): void {
    const sorted = [...records].sort(byCreatedAt);
    this.records.set(sorted);
    this.profilesSignal.set(sorted.map(toSummary));
  }

  // Unlike the entity services, a failed registry write is surfaced to the caller: a profile
  // that silently fails to save would vanish on the next launch.
  private enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(fn);
    this.writeQueue = run.catch(() => undefined);
    return run;
  }

  private persist(record: ProfileRecord): Promise<void> {
    return this.enqueueWrite(async () => {
      const db = await getDeviceDb();
      await db.put('profiles', record);
    });
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
    const record: ProfileRecord = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      colors: [...input.colors],
      password: await hashPassword(input.password, this.iterations),
      cloud: null,
      createdAt: this.nextCreatedAt(),
    };
    this.setRecords([...this.records(), record]);
    await this.persist(record);
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

  setColors(id: string, colors: Color[]): Promise<void> {
    return this.patch(id, { colors: [...colors] });
  }

  setCloud(id: string, link: CloudLink | null): Promise<void> {
    return this.patch(id, { cloud: link });
  }

  /** The profile on this device already linked to a cloud account, if any (FR-033). */
  findByCloudUser(userId: string): ProfileSummary | undefined {
    return this.profiles().find((p) => p.cloud?.userId === userId);
  }
}

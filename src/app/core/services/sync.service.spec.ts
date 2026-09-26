import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSummary } from '@models/profile.model';
import { CloudSessionService } from './cloud-session.service';
import { ConnectivityService } from './connectivity.service';
import { ProfileSessionService, SessionHooks } from './profile-session.service';
import { SYNC_TIMEOUT_MS, SyncService } from './sync.service';

const LINKED: ProfileSummary = {
  id: 'p1',
  name: 'rafa',
  colors: ['R'],
  cloud: { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false },
  createdAt: '2026-01-01T00:00:00.000Z',
};

/** A PostgREST-like query whose result resolves only when `release()` is called. */
function stalledQuery() {
  let release!: (value: { data: unknown[]; error: null }) => void;
  const result = new Promise<{ data: unknown[]; error: null }>((resolve) => (release = resolve));
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    upsert: () => query,
    delete: () => query,
    abortSignal: () => query,
    then: result.then.bind(result),
  };
  return { query, release: () => release({ data: [], error: null }) };
}

describe('SyncService', () => {
  const active = signal<ProfileSummary | null>(LINKED);
  const online = signal(true);
  let hooks: SessionHooks[];
  let pending: ReturnType<typeof stalledQuery>;
  let cloud: {
    client: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    startAutoRefresh: ReturnType<typeof vi.fn>;
    stopAutoRefresh: ReturnType<typeof vi.fn>;
    markNeedsReauth: ReturnType<typeof vi.fn>;
  };
  let sync: SyncService;

  beforeEach(() => {
    vi.useFakeTimers();
    active.set(LINKED);
    online.set(true);
    hooks = [];
    pending = stalledQuery();
    const getSession = vi.fn().mockResolvedValue({ data: { session: {} }, error: null });
    cloud = {
      getSession,
      client: vi.fn(() => ({ auth: { getSession }, from: () => pending.query })),
      startAutoRefresh: vi.fn(),
      stopAutoRefresh: vi.fn(),
      markNeedsReauth: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: CloudSessionService, useValue: cloud },
        { provide: ConnectivityService, useValue: { online } },
        {
          provide: ProfileSessionService,
          useValue: { active, registerHooks: (h: SessionHooks) => hooks.push(h) },
        },
      ],
    });
    sync = TestBed.inject(SyncService);
  });

  afterEach(() => vi.useRealTimers());

  it('runs once while a sync is in flight', () => {
    const first = sync.syncNow();
    const second = sync.syncNow();
    expect(second).toBe(first);
    expect(cloud.client).toHaveBeenCalledTimes(1);
    expect(sync.state()).toBe('syncing');
  });

  it('ends a stalled sync as an error within the bound, and allows a new run', async () => {
    const outcome = sync.syncNow();
    await vi.advanceTimersByTimeAsync(SYNC_TIMEOUT_MS);
    expect(await outcome).toBe('error');
    expect(sync.state()).toBe('error');

    pending = stalledQuery();
    void sync.syncNow();
    expect(cloud.client).toHaveBeenCalledTimes(2);
  });

  it('ends a stalled sync as offline when the device went offline', async () => {
    const outcome = sync.syncNow();
    online.set(false);
    await vi.advanceTimersByTimeAsync(SYNC_TIMEOUT_MS);
    expect(await outcome).toBe('offline');
    expect(sync.state()).toBe('offline');
  });

  it('ignores a run that settles after its timeout', async () => {
    const stale = pending;
    void sync.syncNow();
    await vi.advanceTimersByTimeAsync(SYNC_TIMEOUT_MS);
    expect(sync.state()).toBe('error');

    stale.release();
    await vi.advanceTimersByTimeAsync(0);
    expect(sync.state()).toBe('error');
    expect(sync.lastSyncedAt()).toBeNull();
  });

  it('registers session hooks once that never start a sync', () => {
    sync.start();
    sync.start();
    expect(hooks).toHaveLength(1);

    hooks[0].beforeSwitch(LINKED);
    hooks[0].afterActivate(LINKED);
    expect(cloud.stopAutoRefresh).toHaveBeenCalledWith('p1');
    expect(cloud.startAutoRefresh).toHaveBeenCalledWith('p1');
    expect(cloud.client).not.toHaveBeenCalled();
    expect(sync.state()).toBe('idle');
  });

  it('does not keep a profile that needs reauth refreshing', () => {
    sync.start();
    hooks[0].afterActivate({ ...LINKED, cloud: { ...LINKED.cloud!, needsReauth: true } });
    expect(cloud.startAutoRefresh).not.toHaveBeenCalled();
  });

  it('resets a failure to idle when the profile changes', async () => {
    void sync.syncNow();
    await vi.advanceTimersByTimeAsync(SYNC_TIMEOUT_MS);
    expect(sync.state()).toBe('error');

    await sync.profileChanged();
    expect(sync.state()).toBe('idle');
  });
});

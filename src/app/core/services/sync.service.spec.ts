import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSummary } from '@models/profile.model';
import { CloudAuthService } from './cloud-auth.service';
import { CloudSessionService } from './cloud-session.service';
import { ConnectivityService } from './connectivity.service';
import type { PlanarSelection } from '@models/planar-selection.model';
import { PlanarSelectionService } from './planar-selection.service';
import { ProfileSessionService, SessionHooks } from './profile-session.service';
import { ProfileStore } from './profile-store.service';
import { SYNC_TIMEOUT_MS, SyncService } from './sync.service';

const LINKED: ProfileSummary = {
  id: 'p1',
  name: 'rafa',
  colors: ['R'],
  cloud: { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false },
  createdAt: '2026-01-01T00:00:00.000Z',
  nameUpdatedAt: '2026-01-01T00:00:00.000Z',
  colorsUpdatedAt: '2026-01-01T00:00:00.000Z',
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

/** A PostgREST-like query that resolves at once with `rows`, recording its upserts. */
function settledQuery(rows: unknown[], upserts: unknown[][]) {
  const result = Promise.resolve({ data: rows, error: null });
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    upsert: (...args: unknown[]) => (upserts.push(args), query),
    delete: () => query,
    abortSignal: () => query,
    then: result.then.bind(result),
  };
  return query;
}

describe('SyncService', () => {
  const active = signal<ProfileSummary | null>(LINKED);
  const online = signal(true);
  let hooks: SessionHooks[];
  let pending: ReturnType<typeof stalledQuery>;
  let cloud: {
    client: ReturnType<typeof vi.fn>;
    startAutoRefresh: ReturnType<typeof vi.fn>;
    stopAutoRefresh: ReturnType<typeof vi.fn>;
    markNeedsReauth: ReturnType<typeof vi.fn>;
  };
  let auth: { lookupAccount: ReturnType<typeof vi.fn>; forgetGoneAccount: ReturnType<typeof vi.fn> };
  let profiles: { byId: ReturnType<typeof vi.fn>; setColors: ReturnType<typeof vi.fn> };
  let updateUser: ReturnType<typeof vi.fn>;
  let from: ReturnType<typeof vi.fn>;
  let calls: string[];
  let sync: SyncService;
  const planarSelection = signal<PlanarSelection | null>(null);
  let applyPlanarSelection: ReturnType<typeof vi.fn>;

  /** The account's user, with metadata matching LINKED unless patched. */
  const user = (meta: Record<string, unknown> = {}) => ({
    id: 'u1',
    email: 'rafa@exemplo.com',
    user_metadata: {
      grm_colors: ['R'],
      grm_colors_at: LINKED.colorsUpdatedAt,
      grm_label: 'rafa',
      grm_label_at: LINKED.nameUpdatedAt,
      ...meta,
    },
  });

  beforeEach(() => {
    vi.useFakeTimers();
    active.set(LINKED);
    online.set(true);
    hooks = [];
    pending = stalledQuery();
    calls = [];
    updateUser = vi.fn(async () => (calls.push('updateUser'), { data: {}, error: null }));
    from = vi.fn(() => (calls.push('from'), pending.query));
    cloud = {
      client: vi.fn(() => ({ auth: { updateUser }, from })),
      startAutoRefresh: vi.fn(),
      stopAutoRefresh: vi.fn(),
      markNeedsReauth: vi.fn(async () => {
        const profile = active();
        active.set(profile?.cloud ? { ...profile, cloud: { ...profile.cloud, needsReauth: true } } : profile);
      }),
    };
    auth = {
      lookupAccount: vi.fn().mockResolvedValue({ status: 'ok', user: user() }),
      forgetGoneAccount: vi.fn().mockResolvedValue(undefined),
    };
    profiles = {
      byId: vi.fn(() => active()),
      setColors: vi.fn(async () => void calls.push('setColors')),
    };
    planarSelection.set(null);
    applyPlanarSelection = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PlanarSelectionService,
          useValue: { selection: planarSelection, flush: async () => undefined, applySyncResult: applyPlanarSelection },
        },
        { provide: CloudSessionService, useValue: cloud },
        { provide: CloudAuthService, useValue: auth },
        { provide: ProfileStore, useValue: profiles },
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
    expect(auth.lookupAccount).toHaveBeenCalledTimes(1);
    expect(sync.state()).toBe('syncing');
  });

  it('ends a stalled sync as an error within the bound, and allows a new run', async () => {
    const outcome = sync.syncNow();
    await vi.advanceTimersByTimeAsync(SYNC_TIMEOUT_MS);
    expect(await outcome).toBe('error');
    expect(sync.state()).toBe('error');

    pending = stalledQuery();
    void sync.syncNow();
    expect(auth.lookupAccount).toHaveBeenCalledTimes(2);
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

  it('checks the account first, then leaves the identity alone when nothing changed', async () => {
    void sync.syncNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(auth.lookupAccount).toHaveBeenCalledWith('p1');
    expect(calls).toEqual(['from']);
  });

  it('adopts newer account colors silently, before locations', async () => {
    auth.lookupAccount.mockResolvedValue({
      status: 'ok',
      user: user({ grm_colors: ['G', 'W'], grm_colors_at: '2026-06-01T00:00:00.000Z' }),
    });
    void sync.syncNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(profiles.setColors).toHaveBeenCalledWith('p1', ['G', 'W'], '2026-06-01T00:00:00.000Z');
    expect(updateUser).not.toHaveBeenCalled();
    expect(calls).toEqual(['setColors', 'from']);
  });

  it('writes newer local colors and label in one updateUser, before locations', async () => {
    active.set({ ...LINKED, colors: ['U'], colorsUpdatedAt: '2026-06-01T00:00:00.000Z', nameUpdatedAt: '2026-06-02T00:00:00.000Z' });
    void sync.syncNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({
      data: {
        grm_colors: ['U'],
        grm_colors_at: '2026-06-01T00:00:00.000Z',
        grm_label: 'rafa',
        grm_label_at: '2026-06-02T00:00:00.000Z',
      },
    });
    expect(calls).toEqual(['updateUser', 'from']);
  });

  it('fails the sync when the identity write fails', async () => {
    active.set({ ...LINKED, nameUpdatedAt: '2026-06-02T00:00:00.000Z' });
    updateUser.mockResolvedValue({ data: {}, error: { code: 'unexpected_failure' } });
    expect(await sync.syncNow()).toBe('error');
    expect(from).not.toHaveBeenCalled();
  });

  it('turns a gone account local and settles to idle', async () => {
    auth.lookupAccount.mockResolvedValue({ status: 'gone' });
    expect(await sync.syncNow()).toBe('gone');
    expect(auth.forgetGoneAccount).toHaveBeenCalledWith('p1');
    expect(sync.state()).toBe('idle');
    expect(from).not.toHaveBeenCalled();
  });

  it('asks for reauth when the session is dead', async () => {
    auth.lookupAccount.mockResolvedValue({ status: 'expired' });
    expect(await sync.syncNow()).toBe('reauth');
    expect(cloud.markNeedsReauth).toHaveBeenCalledWith('p1');
    expect(sync.state()).toBe('reauth');
  });

  it('shows expired as soon as the profile needs reauth, without a sync', () => {
    active.set({ ...LINKED, cloud: { ...LINKED.cloud!, needsReauth: true } });
    expect(sync.state()).toBe('reauth');
  });

  it('leaves expired once the profile signs in again, without a sync', async () => {
    auth.lookupAccount.mockResolvedValue({ status: 'expired' });
    await sync.syncNow();
    expect(sync.state()).toBe('reauth');

    active.set(LINKED);
    expect(sync.state()).toBe('idle');
  });

  it('reports offline when the account check can\u2019t reach the server', async () => {
    auth.lookupAccount.mockResolvedValue({ status: 'offline' });
    expect(await sync.syncNow()).toBe('offline');
    expect(sync.state()).toBe('offline');
  });

  describe('planar deck selection', () => {
    const OLD = '2026-06-01T00:00:00.000Z';
    const NEW = '2026-06-02T00:00:00.000Z';
    let upserts: unknown[][];

    /** Every table answers at once; planechase_selections with `remote`. */
    const answer = (remote: unknown[]) => {
      upserts = [];
      from.mockImplementation((table: string) =>
        settledQuery(table === 'planechase_selections' ? remote : [], table === 'planechase_selections' ? upserts : []),
      );
    };

    it('upserts a local selection newer than the account’s', async () => {
      planarSelection.set({ disabledIds: ['a', 'b'], updatedAt: NEW });
      answer([{ user_id: 'u1', disabled_ids: ['c'], updated_at: '2026-06-01T00:00:00+00:00' }]);
      await sync.syncNow();
      expect(upserts).toEqual([
        [{ user_id: 'u1', disabled_ids: ['a', 'b'], updated_at: NEW }, { onConflict: 'user_id' }],
      ]);
      expect(applyPlanarSelection).not.toHaveBeenCalled();
    });

    it('applies an account selection newer than the local one, with its own stamp', async () => {
      planarSelection.set({ disabledIds: ['a'], updatedAt: OLD });
      answer([{ user_id: 'u1', disabled_ids: ['c'], updated_at: '2026-06-02T00:00:00+00:00' }]);
      await sync.syncNow();
      expect(applyPlanarSelection).toHaveBeenCalledWith({ disabledIds: ['c'], updatedAt: NEW });
      expect(upserts).toEqual([]);
    });

    it('does nothing when neither side has a selection', async () => {
      answer([]);
      await sync.syncNow();
      expect(from).toHaveBeenCalledWith('planechase_selections');
      expect(upserts).toEqual([]);
      expect(applyPlanarSelection).not.toHaveBeenCalled();
    });
  });
});

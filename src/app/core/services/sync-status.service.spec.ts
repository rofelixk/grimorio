import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudLink, ProfileSummary } from '@models/profile.model';
import { ProfileModalService } from './profile-modal.service';
import { ProfileSessionService } from './profile-session.service';
import { SyncStatusService } from './sync-status.service';
import { SyncService, SyncState } from './sync.service';

describe('SyncStatusService', () => {
  const active = signal<ProfileSummary | null>(null);
  const state = signal<SyncState>('idle');
  let profileModal: { open: ReturnType<typeof vi.fn> };
  let sync: { state: typeof state; lastSyncedAt: ReturnType<typeof signal<string | null>>; syncNow: ReturnType<typeof vi.fn> };
  let status: SyncStatusService;

  beforeEach(() => {
    vi.useFakeTimers();
    state.set('idle');
    profileModal = { open: vi.fn() };
    sync = { state, lastSyncedAt: signal<string | null>(null), syncNow: vi.fn().mockResolvedValue('done') };
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileSessionService, useValue: { active } },
        { provide: SyncService, useValue: sync },
        { provide: ProfileModalService, useValue: profileModal },
      ],
    });
    status = TestBed.inject(SyncStatusService);
  });

  afterEach(() => vi.useRealTimers());

  const as = (cloud: CloudLink | null) => active.set({ id: 'p1', name: 'rafa', colors: ['R'], cloud } as ProfileSummary);

  it('opens the profile modal at sign-in for a local profile', () => {
    as(null);
    status.act();
    expect(profileModal.open).toHaveBeenCalledWith({ start: 'in' });
    expect(sync.syncNow).not.toHaveBeenCalled();
  });

  it('opens the profile modal at re-sign-in for an expired session', () => {
    as({ userId: 'u1', email: 'rafa@exemplo.com', needsReauth: true });
    state.set('reauth');
    status.act();
    expect(profileModal.open).toHaveBeenCalledWith({ start: 'reauth' });
  });

  it('syncs a linked profile, and does nothing while syncing', () => {
    as({ userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false });
    status.act();
    expect(sync.syncNow).toHaveBeenCalledTimes(1);

    state.set('syncing');
    status.act();
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
  });

  it('settles a gone account to the local display', () => {
    as(null);
    state.set('idle');
    expect(status.display()?.kind).toBe('local');
  });
});

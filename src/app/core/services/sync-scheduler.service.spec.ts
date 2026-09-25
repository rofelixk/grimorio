import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudLink, ProfileSummary } from '@models/profile.model';
import { CardService } from './card.service';
import { CloudSessionService } from './cloud-session.service';
import { ConnectivityService } from './connectivity.service';
import { DeckService } from './deck.service';
import { ProfileSessionService } from './profile-session.service';
import { StorageLocationService } from './storage-location.service';
import { SYNC_DEBOUNCE_MS, SYNC_MAX_WAIT_MS, SyncScheduler } from './sync-scheduler.service';
import { SyncService } from './sync.service';

const linked: CloudLink = { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false };

function profile(cloud: CloudLink | null): ProfileSummary {
  return { id: 'p1', name: 'rafa', colors: ['U', 'R'], cloud, createdAt: '' };
}

describe('SyncScheduler', () => {
  const cardChanges = signal(0);
  const online = signal(true);
  const active = signal<ProfileSummary | null>(profile(linked));
  let syncNow: ReturnType<typeof vi.fn>;

  const change = () => {
    cardChanges.update((n) => n + 1);
    TestBed.tick();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    cardChanges.set(0);
    online.set(true);
    active.set(profile(linked));
    syncNow = vi.fn().mockResolvedValue('done');

    TestBed.configureTestingModule({
      providers: [
        { provide: CardService, useValue: { changeCount: cardChanges } },
        { provide: StorageLocationService, useValue: { changeCount: signal(0) } },
        { provide: DeckService, useValue: { changeCount: signal(0) } },
        { provide: ConnectivityService, useValue: { online } },
        { provide: SyncService, useValue: { syncNow, profileChanged: vi.fn() } },
        { provide: CloudSessionService, useValue: { startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn() } },
        { provide: ProfileSessionService, useValue: { active, registerHooks: vi.fn() } },
      ],
    });
    TestBed.inject(SyncScheduler);
    TestBed.tick();
    syncNow.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('syncs 15 s after the last change', () => {
    change();
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS - 1);
    expect(syncNow).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(syncNow).toHaveBeenCalledTimes(1);
  });

  it('restarts the debounce on every change', () => {
    change();
    vi.advanceTimersByTime(10_000);
    change();
    vi.advanceTimersByTime(10_000);
    expect(syncNow).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5_000);
    expect(syncNow).toHaveBeenCalledTimes(1);
  });

  it('syncs by the 45 s max-wait under continuous changes', () => {
    for (let elapsed = 0; elapsed < SYNC_MAX_WAIT_MS; elapsed += 5_000) {
      change();
      vi.advanceTimersByTime(5_000);
    }
    expect(syncNow).toHaveBeenCalledTimes(1);
  });

  it('does not sync while offline, and retries when the connection returns', async () => {
    online.set(false);
    TestBed.tick();
    change();
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);
    expect(syncNow).not.toHaveBeenCalled();

    online.set(true);
    TestBed.tick();
    expect(syncNow).toHaveBeenCalledTimes(1);
  });

  it('does not retry on reconnect with nothing pending', async () => {
    change();
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);
    await vi.runAllTimersAsync();
    syncNow.mockClear();

    online.set(false);
    TestBed.tick();
    online.set(true);
    TestBed.tick();
    expect(syncNow).not.toHaveBeenCalled();
  });

  it('does not sync an unlinked profile', () => {
    active.set(profile(null));
    change();
    vi.advanceTimersByTime(SYNC_MAX_WAIT_MS);
    expect(syncNow).not.toHaveBeenCalled();
  });

  it('does not sync a profile whose sign-in expired', () => {
    active.set(profile({ ...linked, needsReauth: true }));
    change();
    vi.advanceTimersByTime(SYNC_MAX_WAIT_MS);
    expect(syncNow).not.toHaveBeenCalled();
  });
});

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emitTakeover } from '@db/connection-events';
import { getDeviceDb } from '@db/device-db';
import { otherCopy } from '@testing/cross-tab';
import { DATA } from '@utils/entry-copy';
import { PBKDF2_ITERATIONS, ProfileStore } from './profile-store.service';
import { ProfileSessionService } from './profile-session.service';
import { StorageHealthService } from './storage-health.service';
import { ToastService } from './toast.service';

describe('StorageHealthService', () => {
  let health: StorageHealthService;
  let session: ProfileSessionService;
  let show: ReturnType<typeof vi.spyOn>;
  let signOut: ReturnType<typeof vi.spyOn>;
  let activeId: string;
  let store: ProfileStore;
  let other: ReturnType<typeof otherCopy>;

  beforeEach(async () => {
    other = otherCopy();
    TestBed.configureTestingModule({ providers: [{ provide: PBKDF2_ITERATIONS, useValue: 1 }, other.provider] });
    store = TestBed.inject(ProfileStore);
    await store.whenReady();
    activeId = (await store.create({ name: 'Ana', password: 'x', colors: ['R'] })).id;
    session = TestBed.inject(ProfileSessionService);
    await session.whenReady();
    await session.activate(activeId);
    health = TestBed.inject(StorageHealthService);
    show = vi.spyOn(TestBed.inject(ToastService), 'show');
    signOut = vi.spyOn(session, 'signOut');
    health.start();
  });

  afterEach(() => TestBed.inject(ToastService).dismiss());

  it('requires a reload after another copy opens a newer version', () => {
    expect(health.reloadRequired()).toBe(false);
    emitTakeover({ kind: 'upgrade' });
    expect(health.reloadRequired()).toBe(true);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('toasts, then signs out, when another copy deletes the active profile', async () => {
    emitTakeover({ kind: 'deleted', profileId: activeId });

    expect(show).toHaveBeenCalledExactlyOnceWith(DATA.deletedElsewhere.label, DATA.deletedElsewhere.text);
    expect(signOut).toHaveBeenCalledOnce();
    expect(show.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0]);
    await signOut.mock.results[0].value;
    expect(session.active()).toBeNull();
  });

  it('ignores the deletion of another profile', () => {
    emitTakeover({ kind: 'deleted', profileId: 'someone-else' });
    expect(show).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(health.reloadRequired()).toBe(false);
  });

  describe('when another copy deletes the active profile', () => {
    async function deleteRecordElsewhere(): Promise<void> {
      const db = await getDeviceDb();
      await db.delete('profiles', activeId);
    }

    it('signs out exactly once when the registry change arrives first', async () => {
      await deleteRecordElsewhere();
      await other.announce('profiles', null);
      await store.refresh();
      expect(session.active()?.id).toBe(activeId);

      emitTakeover({ kind: 'deleted', profileId: activeId });
      await signOut.mock.results[0].value;
      await other.announce('profiles', null);

      expect(show).toHaveBeenCalledOnce();
      expect(signOut).toHaveBeenCalledOnce();
      await vi.waitFor(() => expect(store.byId(activeId)).toBeUndefined());
      expect(session.active()).toBeNull();
    });

    it('signs out exactly once when the takeover arrives first', async () => {
      emitTakeover({ kind: 'deleted', profileId: activeId });
      await deleteRecordElsewhere();
      await other.announce('profiles', null);
      await signOut.mock.results[0].value;

      expect(show).toHaveBeenCalledOnce();
      expect(signOut).toHaveBeenCalledOnce();
      await vi.waitFor(() => expect(store.byId(activeId)).toBeUndefined());
      expect(session.active()).toBeNull();
    });
  });

  it('subscribes once however often start() runs', () => {
    health.start();
    emitTakeover({ kind: 'deleted', profileId: activeId });
    expect(show).toHaveBeenCalledOnce();
  });
});

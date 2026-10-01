import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failNextPut } from '@testing/idb-failure';
import { DATA } from '@utils/entry-copy';
import { getDeviceDb } from '../db/device-db';
import { openProfileDb } from '../db/profile-db';
import { PlanarSelectionService } from './planar-selection.service';
import { ToastService } from './toast.service';

async function profileSelection(profileId: string) {
  const db = await openProfileDb(profileId);
  return (await db.get('meta', 'planarSelection'))?.value;
}

async function deviceSelection() {
  const db = await getDeviceDb();
  return (await db.get('meta', 'planarSelection'))?.value;
}

describe('PlanarSelectionService', () => {
  let service: PlanarSelectionService;

  beforeEach(() => {
    service = TestBed.inject(PlanarSelectionService);
  });

  // A write still queued would land in the next test's fresh database.
  afterEach(() => service.flush());

  it('is null (every card enabled) until something is saved', async () => {
    await service.load(null);
    expect(service.selection()).toBeNull();
    await service.load('p1');
    expect(service.selection()).toBeNull();
  });

  it('keeps the device selection apart from each profile', async () => {
    await service.load(null);
    service.save(['a']);
    await service.load('p1');
    expect(service.selection()).toBeNull();
    service.save(['b']);
    await service.load('p2');
    expect(service.selection()).toBeNull();

    await service.load(null);
    expect(service.selection()?.disabledIds).toEqual(['a']);
    await service.load('p1');
    expect(service.selection()?.disabledIds).toEqual(['b']);
  });

  it('toasts a failed save and still lands the next one (SC-001)', async () => {
    await service.load('p1');
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');
    const restore = failNextPut();
    service.save(['a']);
    await service.flush();
    expect(show).toHaveBeenCalledExactlyOnceWith(DATA.saveFailed.label, DATA.saveFailed.text);

    service.save(['b']);
    await service.flush();
    restore();
    expect(show).toHaveBeenCalledOnce();
    expect(await profileSelection('p1')).toEqual(service.selection());
  });

  it('stamps updatedAt on save', async () => {
    await service.load(null);
    const before = new Date().toISOString();
    service.save(['a']);
    expect(service.selection()!.updatedAt >= before).toBe(true);
  });

  it('lands a write enqueued before a switch in its original target', async () => {
    await service.load('p1');
    service.save(['x']);
    const switched = service.load(null);
    expect(service.selection()).toBeNull();
    await switched;
    expect(service.selection()).toBeNull();
    expect(await profileSelection('p1')).toEqual(expect.objectContaining({ disabledIds: ['x'] }));
    expect(await deviceSelection()).toBeUndefined();
  });

  it('applySyncResult stores the given selection without restamping', async () => {
    await service.load('p1');
    const synced = { disabledIds: ['s'], updatedAt: '2020-01-01T00:00:00.000Z' };
    service.applySyncResult(synced);
    await service.flush();
    expect(service.selection()).toEqual(synced);
    expect(await profileSelection('p1')).toEqual(synced);
  });
});

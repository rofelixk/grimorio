import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { delivered, nextRefresh, otherCopy } from '@testing/cross-tab';
import { ACTIVE_PROFILE_KEY, getDeviceDb } from '../db/device-db';
import { setActiveProfileDb } from '../db/entity-store';
import { PBKDF2_ITERATIONS, ProfileStore } from './profile-store.service';
import { StoragePersistenceService } from './storage-persistence.service';

function freshStore(extra: Provider[] = []): ProfileStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: PBKDF2_ITERATIONS, useValue: 5 }, ...extra] });
  return TestBed.inject(ProfileStore);
}

describe('ProfileStore', () => {
  let store: ProfileStore;

  beforeEach(async () => {
    store = freshStore();
    await store.whenReady();
  });

  it('starts with no profiles', () => {
    expect(store.profiles()).toEqual([]);
  });

  it('creates a profile with a trimmed name, its colors and no cloud link', async () => {
    const created = await store.create({ name: '  rafa ', password: 'grimorio123', colors: ['U', 'R'] });

    expect(created).toMatchObject({ name: 'rafa', colors: ['U', 'R'], cloud: null });
    expect(store.profiles()).toEqual([created]);
  });

  it('checks name uniqueness trimmed and case-insensitively', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });

    expect(store.isNameTaken('RAFA')).toBe(true);
    expect(store.isNameTaken(' Rafa ')).toBe(true);
    expect(store.isNameTaken('bia')).toBe(false);
    expect(store.isNameTaken('rafa', rafa.id)).toBe(false);
  });

  it('verifies the password without ever exposing its hash', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });

    expect(await store.verifyPassword(rafa.id, 'grimorio123')).toBe(true);
    expect(await store.verifyPassword(rafa.id, 'errada123')).toBe(false);
    expect(store.profiles()[0]).not.toHaveProperty('password');
    expect(JSON.stringify(store.profiles())).not.toContain('grimorio123');
  });

  it('stores a hash, never the password, on disk', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
    const stored = await (await getDeviceDb()).get('profiles', rafa.id);

    expect(stored?.password.algo).toBe('PBKDF2-SHA256');
    expect(stored?.password.iterations).toBe(5);
    expect(JSON.stringify(stored)).not.toContain('grimorio123');
  });

  it('replaces the password', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
    await store.setPassword(rafa.id, 'novasenha1');

    expect(await store.verifyPassword(rafa.id, 'grimorio123')).toBe(false);
    expect(await store.verifyPassword(rafa.id, 'novasenha1')).toBe(true);
  });

  it('finds the profile linked to a cloud user', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
    await store.setCloud(rafa.id, { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false });

    expect(store.findByCloudUser('u1')?.name).toBe('rafa');
    expect(store.findByCloudUser('u2')).toBeUndefined();
  });

  it('persists profiles, colors and links across a fresh instance, oldest first', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['U', 'R'] });
    await store.create({ name: 'bia', password: 'grimorio123', colors: ['G'] });
    await store.setColors(rafa.id, ['W']);
    await store.setCloud(rafa.id, { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: true });
    await store.flush();

    const reloaded = freshStore();
    await reloaded.whenReady();

    expect(reloaded.profiles().map((p) => p.name)).toEqual(['rafa', 'bia']);
    expect(reloaded.profiles()[0]).toMatchObject({
      colors: ['W'],
      cloud: { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: true },
    });
    expect(await reloaded.verifyPassword(rafa.id, 'grimorio123')).toBe(true);
  });

  it('stamps both timestamps at creation', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });

    expect(rafa.nameUpdatedAt).toBe(rafa.createdAt);
    expect(rafa.colorsUpdatedAt).toBe(rafa.createdAt);
  });

  it('renames trimmed, restamping only nameUpdatedAt, and persists it', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
    await new Promise((r) => setTimeout(r, 2));
    await store.rename(rafa.id, '  rafa_2 ');

    const renamed = store.byId(rafa.id)!;
    expect(renamed.name).toBe('rafa_2');
    expect(renamed.nameUpdatedAt > rafa.nameUpdatedAt).toBe(true);
    expect(renamed.colorsUpdatedAt).toBe(rafa.colorsUpdatedAt);

    await store.flush();
    const reloaded = freshStore();
    await reloaded.whenReady();
    expect(reloaded.byId(rafa.id)).toMatchObject({ name: 'rafa_2', nameUpdatedAt: renamed.nameUpdatedAt });
  });

  it('restamps colorsUpdatedAt on setColors, keeping a passed timestamp', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
    await new Promise((r) => setTimeout(r, 2));
    await store.setColors(rafa.id, ['U']);
    expect(store.byId(rafa.id)!.colorsUpdatedAt > rafa.colorsUpdatedAt).toBe(true);

    await store.setColors(rafa.id, ['G', 'W'], '2030-01-01T00:00:00.000Z');
    expect(store.byId(rafa.id)).toMatchObject({ colors: ['G', 'W'], colorsUpdatedAt: '2030-01-01T00:00:00.000Z' });
    expect(store.byId(rafa.id)!.nameUpdatedAt).toBe(rafa.nameUpdatedAt);
  });

  it('removes a profile and clears activeProfileId when it was active', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
    const bia = await store.create({ name: 'bia', password: 'grimorio123', colors: ['G'] });
    const db = await getDeviceDb();
    await db.put('meta', { key: ACTIVE_PROFILE_KEY, value: rafa.id });

    await store.remove(rafa.id);

    expect(store.profiles().map((p) => p.id)).toEqual([bia.id]);
    expect(await db.get('profiles', rafa.id)).toBeUndefined();
    expect((await db.get('meta', ACTIVE_PROFILE_KEY))?.value).toBeNull();
  });

  it('asks for persistent storage once a created profile lands (FR-006)', async () => {
    const request = vi.spyOn(TestBed.inject(StoragePersistenceService), 'request').mockResolvedValue();
    await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
    expect(request).toHaveBeenCalledExactlyOnceWith('created');
  });

  describe('with another open copy', () => {
    let other: ReturnType<typeof otherCopy>;

    beforeEach(async () => {
      other = otherCopy();
      store = freshStore([other.provider]);
      await store.whenReady();
    });

    it('announces every landed registry write as device data', async () => {
      const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
      await store.rename(rafa.id, 'rafael');
      await store.remove(rafa.id);
      await delivered();
      expect(other.received).toEqual([
        { kind: 'profiles', profileId: null },
        { kind: 'profiles', profileId: null },
        { kind: 'profiles', profileId: null },
      ]);
    });

    it('picks up a profile another copy created', async () => {
      const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
      const db = await getDeviceDb();
      const record = (await db.get('profiles', rafa.id))!;
      await db.put('profiles', { ...record, id: 'theirs', name: 'bia', createdAt: '2030-01-01T00:00:00.000Z' });

      const refreshed = nextRefresh(store);
      await other.announce('profiles', null);
      await refreshed;
      expect(store.profiles().map((p) => p.name)).toEqual(['rafa', 'bia']);
    });

    it('keeps the open profile listed when another copy deleted it, until this copy leaves it', async () => {
      const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
      await setActiveProfileDb(rafa.id);
      const db = await getDeviceDb();
      await db.delete('profiles', rafa.id);

      await other.announce('profiles', null);
      await store.refresh();
      expect(store.byId(rafa.id)).toBeDefined();

      await setActiveProfileDb(null);
      await store.refresh();
      expect(store.byId(rafa.id)).toBeUndefined();
    });
  });

  it('keeps activeProfileId when another profile is removed', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
    const bia = await store.create({ name: 'bia', password: 'grimorio123', colors: ['G'] });
    const db = await getDeviceDb();
    await db.put('meta', { key: ACTIVE_PROFILE_KEY, value: rafa.id });

    await store.remove(bia.id);

    expect((await db.get('meta', ACTIVE_PROFILE_KEY))?.value).toBe(rafa.id);
  });

  it('treats a case-only change of its own name as free and another name as taken', async () => {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
    await store.create({ name: 'abc', password: 'grimorio123', colors: ['G'] });

    expect(store.isNameTaken('RAFA', rafa.id)).toBe(false);
    expect(store.isNameTaken('ABC', rafa.id)).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDeviceDb } from '../db/device-db';
import { PBKDF2_ITERATIONS, ProfileStore } from './profile-store.service';

function freshStore(): ProfileStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: PBKDF2_ITERATIONS, useValue: 5 }] });
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
});

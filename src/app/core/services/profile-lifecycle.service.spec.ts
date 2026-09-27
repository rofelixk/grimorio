import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { openProfileDb } from '../db/profile-db';
import { MSG } from '../utils/entry-copy';
import { CardService } from './card.service';
import { CloudSessionService } from './cloud-session.service';
import { ConnectivityService } from './connectivity.service';
import { ProfileLifecycleService } from './profile-lifecycle.service';
import { ProfileSessionService } from './profile-session.service';
import { PBKDF2_ITERATIONS, ProfileStore } from './profile-store.service';

describe('ProfileLifecycleService', () => {
  let store: ProfileStore;
  let session: ProfileSessionService;
  let cards: CardService;
  let lifecycle: ProfileLifecycleService;
  let cloud: {
    client: ReturnType<typeof vi.fn>;
    stopAutoRefresh: ReturnType<typeof vi.fn>;
    removeSession: ReturnType<typeof vi.fn>;
    whileUnlinking: (id: string, fn: () => Promise<void>) => Promise<void>;
  };
  let signOutLocal: ReturnType<typeof vi.fn>;

  const dbNames = async () => (await indexedDB.databases()).map((d) => d.name);

  beforeEach(async () => {
    signOutLocal = vi.fn().mockResolvedValue({ error: null });
    cloud = {
      client: vi.fn(() => ({ auth: { signOut: signOutLocal } })),
      stopAutoRefresh: vi.fn(),
      removeSession: vi.fn(),
      whileUnlinking: (_id, fn) => fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PBKDF2_ITERATIONS, useValue: 5 },
        { provide: CloudSessionService, useValue: cloud },
        { provide: ConnectivityService, useValue: { online: signal(true) } },
      ],
    });
    store = TestBed.inject(ProfileStore);
    session = TestBed.inject(ProfileSessionService);
    cards = TestBed.inject(CardService);
    lifecycle = TestBed.inject(ProfileLifecycleService);
    await session.whenReady();
  });

  async function seed() {
    const rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['R'] });
    const bia = await store.create({ name: 'bia', password: 'grimorio123', colors: ['G'] });
    await session.activate(bia.id);
    cards.add(mockCardEntryWithoutId({ name: 'Sol Ring' }));
    await session.activate(rafa.id);
    cards.add(mockCardEntryWithoutId({ name: 'Llanowar Elves' }));
    await cards.flush();
    return { rafa, bia };
  }

  it('deletes nothing on a wrong password', async () => {
    const { rafa } = await seed();

    await expect(lifecycle.deleteProfile(rafa.id, 'errada123')).rejects.toEqual({
      kind: 'field',
      field: 'pw',
      message: MSG.wrongLocal,
    });
    expect(session.active()?.id).toBe(rafa.id);
    expect(store.byId(rafa.id)).toBeDefined();
    expect(cards.cards()).toHaveLength(1);
  });

  it('signs out, deletes the database and the record, and keeps the other profile intact', async () => {
    const { rafa, bia } = await seed();

    const left = await lifecycle.deleteProfile(rafa.id, 'grimorio123');

    expect(left).toBe(1);
    expect(session.active()).toBeNull();
    expect(store.byId(rafa.id)).toBeUndefined();
    expect(await dbNames()).not.toContain(`grimorio-profile-${rafa.id}`);
    const biaCards = await (await openProfileDb(bia.id)).getAll('cards');
    expect(biaCards.map((c) => c.name)).toEqual(['Sol Ring']);
    expect(cloud.removeSession).not.toHaveBeenCalled();
  });

  it('clears a linked profile’s cloud session, leaving the account alone', async () => {
    const { rafa } = await seed();
    await store.setCloud(rafa.id, { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false });

    await lifecycle.deleteProfile(rafa.id, 'grimorio123');

    expect(cloud.stopAutoRefresh).toHaveBeenCalledWith(rafa.id);
    expect(signOutLocal).toHaveBeenCalledWith({ scope: 'local' });
    expect(cloud.removeSession).toHaveBeenCalledWith(rafa.id);
  });

  it('resolves with 0 after deleting the last profile', async () => {
    const solo = await store.create({ name: 'solo', password: 'grimorio123', colors: ['U'] });
    await session.activate(solo.id);

    expect(await lifecycle.deleteProfile(solo.id, 'grimorio123')).toBe(0);
  });
});

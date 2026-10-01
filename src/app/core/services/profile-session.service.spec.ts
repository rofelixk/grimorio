import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileSummary } from '@models/profile.model';
import { ACTIVE_PROFILE_KEY, getDeviceDb } from '../db/device-db';
import { CardService } from './card.service';
import { CollectionService } from './collection.service';
import { DeckService } from './deck.service';
import { PlanarSelectionService } from './planar-selection.service';
import { ProfileSessionService, SessionHooks } from './profile-session.service';
import { ProfileStore } from './profile-store.service';

const SERVICES = ['cards', 'collections', 'decks', 'planarSelection'] as const;
type ServiceName = (typeof SERVICES)[number];

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('ProfileSessionService', () => {
  let log: string[];
  let pendingLoad: Partial<Record<ServiceName, Deferred>>;
  let stubs: Record<ServiceName, { flush: ReturnType<typeof vi.fn>; load: ReturnType<typeof vi.fn> }>;
  let store: ProfileStore;
  let rafa: ProfileSummary;
  let bia: ProfileSummary;

  const session = () => TestBed.inject(ProfileSessionService);
  const loadsWith = (id: string | null) => SERVICES.every((name) => stubs[name].load.mock.lastCall?.[0] === id);
  const saveActiveId = async (id: string | null) =>
    (await getDeviceDb()).put('meta', { key: ACTIVE_PROFILE_KEY, value: id });
  const savedActiveId = async () => (await (await getDeviceDb()).get('meta', ACTIVE_PROFILE_KEY))?.value;

  beforeEach(async () => {
    log = [];
    pendingLoad = {};
    const stub = (name: ServiceName) => ({
      flush: vi.fn(async () => {
        log.push(`${name}.flush`);
      }),
      load: vi.fn(async (id: string | null) => {
        log.push(`${name}.load(${id})`);
        await pendingLoad[name]?.promise;
      }),
    });
    stubs = { cards: stub('cards'), collections: stub('collections'), decks: stub('decks'), planarSelection: stub('planarSelection') };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CardService, useValue: stubs.cards },
        { provide: CollectionService, useValue: stubs.collections },
        { provide: DeckService, useValue: stubs.decks },
        { provide: PlanarSelectionService, useValue: stubs.planarSelection },
      ],
    });
    store = TestBed.inject(ProfileStore);
    await store.whenReady();
    rafa = await store.create({ name: 'rafa', password: 'grimorio123', colors: ['U', 'R'] });
    bia = await store.create({ name: 'bia', password: 'grimorio123', colors: ['G'] });
  });

  describe('whenReady', () => {
    it('loads every entity service with the saved active profile', async () => {
      await saveActiveId(rafa.id);

      await session().whenReady();

      expect(loadsWith(rafa.id)).toBe(true);
      expect(session().active()).toEqual(rafa);
    });

    it('loads every entity service with no profile when none is saved', async () => {
      await session().whenReady();

      expect(loadsWith(null)).toBe(true);
      expect(session().active()).toBeNull();
    });

    it('loads with no profile when the saved id is unknown', async () => {
      await saveActiveId('deleted-profile');

      await session().whenReady();

      expect(loadsWith(null)).toBe(true);
      expect(session().active()).toBeNull();
    });

    it('resolves only after every load settles', async () => {
      await saveActiveId(rafa.id);
      pendingLoad.decks = deferred();
      let ready = false;

      const whenReady = session()
        .whenReady()
        .then(() => (ready = true));
      await vi.waitFor(() => expect(stubs.decks.load).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve));

      expect(ready).toBe(false);
      expect(session().active()).toBeNull();

      pendingLoad.decks.resolve();
      await whenReady;
      expect(ready).toBe(true);
      expect(session().active()).toEqual(rafa);
    });
  });

  describe('switching', () => {
    beforeEach(async () => {
      await session().whenReady();
      log.length = 0;
    });

    it('activate flushes every service before any loads, then loads the new profile', async () => {
      await session().activate(rafa.id);

      const flushes = SERVICES.map((name) => log.indexOf(`${name}.flush`));
      const loads = SERVICES.map((name) => log.indexOf(`${name}.load(${rafa.id})`));
      expect([...flushes, ...loads].every((index) => index >= 0)).toBe(true);
      expect(Math.max(...flushes)).toBeLessThan(Math.min(...loads));
      expect(session().active()).toEqual(rafa);
      expect(await savedActiveId()).toBe(rafa.id);
    });

    it('signOut flushes, then loads every service with no profile', async () => {
      await session().activate(rafa.id);
      log.length = 0;

      await session().signOut();

      expect(log.slice(0, SERVICES.length).every((entry) => entry.endsWith('.flush'))).toBe(true);
      expect(log.slice(SERVICES.length).sort()).toEqual(SERVICES.map((name) => `${name}.load(null)`).sort());
      expect(session().active()).toBeNull();
      expect(await savedActiveId()).toBeNull();
    });

    it('shows no active profile while the switch is loading', async () => {
      await session().activate(rafa.id);
      pendingLoad.cards = deferred();

      const switching = session().activate(bia.id);
      await vi.waitFor(() => expect(stubs.cards.load).toHaveBeenLastCalledWith(bia.id));

      expect(session().active()).toBeNull();

      pendingLoad.cards.resolve();
      await switching;
      expect(session().active()).toEqual(bia);
    });
  });

  describe('hooks', () => {
    const hooks = (): SessionHooks & { calls: string[] } => {
      const calls: string[] = [];
      return {
        calls,
        beforeSwitch: (previous) => calls.push(`before(${previous?.name ?? null})`),
        afterActivate: (active) => calls.push(`after(${active?.name ?? null})`),
      };
    };

    it('runs afterActivate once ready, and around every switch', async () => {
      await saveActiveId(rafa.id);
      const early = hooks();
      session().registerHooks(early);
      expect(early.calls).toEqual([]);

      await session().whenReady();
      expect(early.calls).toEqual(['after(rafa)']);

      await session().activate(bia.id);
      await session().signOut();
      expect(early.calls).toEqual(['after(rafa)', 'before(rafa)', 'after(bia)', 'before(bia)', 'after(null)']);
    });

    it('runs afterActivate right away for hooks registered after startup', async () => {
      await saveActiveId(bia.id);
      await session().whenReady();

      const late = hooks();
      session().registerHooks(late);

      expect(late.calls).toEqual(['after(bia)']);
    });
  });
});

import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanechaseGame } from '@models/planechase-game.model';
import { setActiveProfileDb } from '@db/entity-store';
import { delivered, nextRefresh, otherCopy } from '@testing/cross-tab';
import { failNextPut } from '@testing/idb-failure';
import { DATA } from '@utils/entry-copy';
import { PLANAR_DATA, PLANAR_RECORDS, PLANAR_TRANSLATIONS, scriptedRandom } from '@testing/planechase-fixtures';
import { getDeviceDb } from '../db/device-db';
import { PLANECHASE_DATA, PlanechaseCatalogService } from './planechase-catalog.service';
import { PLANECHASE_RANDOM, PlanechaseGameService } from './planechase-game.service';
import { ToastService } from './toast.service';

const IDS = PLANAR_RECORDS.map((card) => card.id);
/** Fisher–Yates with j = i at every step keeps the input order. */
const IN_ORDER = Array.from({ length: IDS.length - 1 }, (_, i) => IDS.length - 1 - i);

async function setUp(data = PLANAR_DATA, extra: Provider[] = []): Promise<PlanechaseGameService> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      ...extra,
      { provide: PLANECHASE_DATA, useValue: () => Promise.resolve({ cards: data, translations: PLANAR_TRANSLATIONS }) },
      { provide: PLANECHASE_RANDOM, useValue: scriptedRandom(IN_ORDER) },
    ],
  });
  const game = TestBed.inject(PlanechaseGameService);
  await game.whenReady();
  await TestBed.inject(PlanechaseCatalogService).load();
  return game;
}

describe('PlanechaseGameService', () => {
  let service: PlanechaseGameService;

  beforeEach(async () => {
    service = await setUp();
  });

  // A write still queued would land in the next test's fresh database.
  afterEach(() => service.flush());

  it('has no game until one starts', () => {
    expect(service.game()).toBeNull();
    expect(service.inProgress()).toBe(false);
    expect(service.actions()).toBeNull();
  });

  it('toasts a failed save and still lands the next one (SC-001)', async () => {
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');
    const restore = failNextPut();
    service.start(IDS);
    await service.flush();
    expect(show).toHaveBeenCalledExactlyOnceWith(DATA.saveFailed.label, DATA.saveFailed.text);

    service.planeswalk();
    await service.flush();
    restore();
    expect(show).toHaveBeenCalledOnce();
    const db = await getDeviceDb();
    expect((await db.get('meta', 'planechaseGame'))?.value).toEqual(service.game());
  });

  it('starts, plays and persists the whole game, a pending phenomenon and its undo included', async () => {
    service.start(IDS);
    expect(service.game()!.current).toBe('p01');
    // p02…p06, then f01 turns up.
    for (let i = 0; i < 6; i++) {
      service.planeswalk();
    }
    const played = service.game()!;
    expect(played.current).toBe('f01');
    expect(played.pending).toBe('phenomenon');
    expect(played.undo).not.toBeNull();
    expect(service.actions()!.roll).toBe(false);
    await service.flush();

    const reloaded = await setUp();
    expect(reloaded.game()).toEqual(played);
    expect(reloaded.inProgress()).toBe(true);
  });

  it('ignores an action the state does not allow', () => {
    service.start(IDS);
    for (let i = 0; i < 6; i++) {
      service.planeswalk();
    }
    const pending = service.game();
    service.roll();
    service.resetCost();
    expect(service.game()).toBe(pending);
  });

  it('end clears the stored game', async () => {
    service.start(IDS);
    service.end();
    await service.flush();
    expect(service.game()).toBeNull();
    const db = await getDeviceDb();
    expect(await db.get('meta', 'planechaseGame')).toBeUndefined();
  });

  it('repairs a stored game against the catalog once', async () => {
    const stored: PlanechaseGame = {
      list: ['p01', 'p02', 'gone'],
      current: 'p01',
      used: ['gone'],
      drawOrder: ['p02'],
      cost: 1,
      pending: null,
      result: { kind: 'blank' },
      undo: null,
    };
    const db = await getDeviceDb();
    await db.put('meta', { key: 'planechaseGame', value: stored });

    const reloaded = await setUp();
    reloaded.repairIfNeeded();
    expect(reloaded.game()).toEqual({ ...stored, list: ['p01', 'p02'], used: [] });
    await reloaded.flush();
    expect((await db.get('meta', 'planechaseGame'))?.value).toEqual(reloaded.game());
  });

  describe('with another open copy', () => {
    let other: ReturnType<typeof otherCopy>;

    beforeEach(async () => {
      await service.flush();
      other = otherCopy();
      service = await setUp(PLANAR_DATA, [other.provider]);
    });

    it('announces each landed move as device data (FR-012)', async () => {
      service.start(IDS);
      service.planeswalk();
      await service.flush();
      await delivered();
      expect(other.received).toEqual([
        { kind: 'planechaseGame', profileId: null },
        { kind: 'planechaseGame', profileId: null },
      ]);
    });

    it('picks up the game another copy saved, whatever profile is open', async () => {
      await setActiveProfileDb('p1');
      service.start(IDS);
      await service.flush();
      const moved = { ...service.game()!, cost: 3 };
      const db = await getDeviceDb();
      await db.put('meta', { key: 'planechaseGame', value: moved });

      const refreshed = nextRefresh(service);
      await other.announce('planechaseGame', null);
      await refreshed;
      expect(service.game()).toEqual(moved);
    });
  });
});

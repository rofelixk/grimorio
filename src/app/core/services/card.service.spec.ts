import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockCardEntry, mockCardEntryWithoutId } from '@testing/card.mocks';
import { delivered, nextRefresh, otherCopy } from '@testing/cross-tab';
import { getAllFromStore } from '../db/entity-store';
import { openProfileDb } from '../db/profile-db';
import { CardEntry } from '@models/card.model';
import { failNextPut } from '@testing/idb-failure';
import { DATA } from '@utils/entry-copy';
import { CardService } from './card.service';
import { ToastService } from './toast.service';

const baseCard = mockCardEntryWithoutId();

describe('CardService', () => {
  let service: CardService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CardService);
    await service.load('p1');
  });

  afterEach(async () => {
    // Ensure any write left pending by a test that didn't await it lands before
    // the next test's beforeEach deletes and recreates the database.
    await service.flush();
    vi.useRealTimers();
  });

  it('starts empty when nothing is persisted', () => {
    expect(service.cards()).toEqual([]);
  });

  it('toasts a failed save and still lands the next one (SC-001)', async () => {
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');
    const restore = failNextPut();
    service.add(baseCard);
    await service.flush();
    expect(show).toHaveBeenCalledExactlyOnceWith(DATA.saveFailed.label, DATA.saveFailed.text);

    service.add(baseCard);
    await service.flush();
    restore();
    expect(show).toHaveBeenCalledOnce();
    // Writes are per row: the failed one is lost, the next one lands on its own.
    expect(await getAllFromStore<CardEntry>('cards')).toHaveLength(1);
  });

  describe('with another open copy', () => {
    let other: ReturnType<typeof otherCopy>;

    beforeEach(async () => {
      await service.flush();
      TestBed.resetTestingModule();
      other = otherCopy();
      TestBed.configureTestingModule({ providers: [other.provider] });
      service = TestBed.inject(CardService);
      await service.load('p1');
    });

    /** Another copy's save: straight into p1's database. */
    async function writeElsewhere(cards: CardEntry[]): Promise<void> {
      const db = await openProfileDb('p1');
      await Promise.all(cards.map((card) => db.put('cards', card)));
    }

    it('announces a landed save with its profile (FR-011)', async () => {
      service.add(baseCard);
      await service.flush();
      await delivered();
      expect(other.received).toEqual([{ kind: 'cards', profileId: 'p1' }]);

      service.applySyncResult([]);
      await service.flush();
      await delivered();
      expect(other.received).toHaveLength(2);
    });

    it('refreshes in place when another copy saves, counting no change', async () => {
      const mine = service.add(baseCard);
      await service.flush();
      const count = service.changeCount();
      const theirs = mockCardEntry({ id: 'theirs' });
      await writeElsewhere([theirs]);

      const refreshed = nextRefresh(service);
      const arrived = other.announce('cards', 'p1');
      expect(service.cards()).toEqual([mine]);
      await arrived;
      await refreshed;
      expect(service.cards()).toHaveLength(2);
      expect(service.cards()).toEqual(expect.arrayContaining([mine, theirs]));
      expect(service.changeCount()).toBe(count);
    });

    it('ignores a save for another profile (FR-013)', async () => {
      await writeElsewhere([mockCardEntry({ id: 'theirs' })]);
      await other.announce('cards', 'p2');
      await service.flush();
      expect(service.cards()).toEqual([]);
    });

    it('loses a refresh to a newer load()', async () => {
      await writeElsewhere([mockCardEntry({ id: 'theirs' })]);
      const refreshed = service.refresh();
      const loaded = service.load('p2');
      await Promise.all([refreshed, loaded]);
      expect(service.cards()).toEqual([]);
    });

    it('never overwrites a change made here while it reads', async () => {
      await writeElsewhere([mockCardEntry({ id: 'theirs' })]);
      const refreshed = service.refresh();
      const mine = service.add(baseCard);
      await refreshed;
      expect(service.cards()).toEqual(expect.arrayContaining([mine]));
    });
  });

  it('adds a card and persists it to IndexedDB', async () => {
    const added = service.add(baseCard);

    expect(service.cards()).toEqual([added]);
    await service.flush();
    expect(await getAllFromStore<CardEntry>('cards')).toEqual([added]);
  });

  it('updates a card in place', () => {
    const added = service.add(baseCard);

    service.update(added.id, { quantity: 4, forSale: true });

    expect(service.cards()[0]).toEqual({
      ...added,
      quantity: 4,
      forSale: true,
      updatedAt: service.cards()[0].updatedAt,
    });
  });

  it('stamps id, updatedAt and addedAt with one instant on add', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const added = service.add(baseCard);
    vi.useRealTimers();
    expect(added.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(added.addedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(added.id).toBeTruthy();
  });

  it('bumps updatedAt on update but keeps addedAt and locationId', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const added = service.add(mockCardEntryWithoutId({ locationId: 'loc-1' }));

    vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    service.update(added.id, { quantity: 2 });
    vi.useRealTimers();

    expect(service.cards()[0]).toEqual({
      ...added,
      quantity: 2,
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    await service.flush();
    expect(await getAllFromStore<CardEntry>('cards')).toEqual(service.cards());
  });

  describe('mergeInto', () => {
    it('grows the target without a new row and keeps addedAt', async () => {
      const target = service.add(mockCardEntryWithoutId({ quantity: 2 }));
      service.mergeInto(target.id, 3);

      expect(service.cards()).toHaveLength(1);
      expect(service.cards()[0]).toMatchObject({ id: target.id, quantity: 5, addedAt: target.addedAt });
      await service.flush();
      expect((await getAllFromStore<CardEntry>('cards'))[0].quantity).toBe(5);
      expect(await service.getTombstones()).toEqual([]);
    });

    it('with removeId deletes that row and writes its tombstone in one transaction', async () => {
      const target = service.add(mockCardEntryWithoutId({ quantity: 2 }));
      const edited = service.add(mockCardEntryWithoutId({ quantity: 4 }));
      await service.flush();

      service.mergeInto(target.id, 4, edited.id);
      await service.flush();

      expect(service.cards().map((c) => [c.id, c.quantity])).toEqual([[target.id, 6]]);
      expect((await getAllFromStore<CardEntry>('cards')).map((c) => c.id)).toEqual([target.id]);
      expect((await service.getTombstones()).map((t) => t.id)).toEqual([edited.id]);
    });

    it('lets a tombstone be cleared', async () => {
      const target = service.add(mockCardEntryWithoutId());
      const edited = service.add(mockCardEntryWithoutId());
      service.mergeInto(target.id, 1, edited.id);
      await service.flush();

      await service.clearTombstones([edited.id]);

      expect(await service.getTombstones()).toEqual([]);
    });

    it('counts as a user change', () => {
      const target = service.add(mockCardEntryWithoutId());
      const before = service.changeCount();
      service.mergeInto(target.id, 1);
      expect(service.changeCount()).toBe(before + 1);
    });
  });

  it('applySyncResult replaces state verbatim without touching tombstones', async () => {
    const target = service.add(baseCard);
    const edited = service.add(baseCard);
    service.mergeInto(target.id, 1, edited.id);
    await service.flush();

    service.applySyncResult([target]);

    expect(service.cards()).toEqual([target]);
    expect((await service.getTombstones()).map((t) => t.id)).toEqual([edited.id]);
  });

  describe('byLocation', () => {
    it('groups by location, newest added first, then by id', () => {
      const mk = (id: string, locationId: string, addedAt: string) =>
        mockCardEntry({ id, locationId, addedAt });
      service.applySyncResult([
        mk('a', 'x', '2026-01-01T00:00:00.000Z'),
        mk('b', 'x', '2026-01-03T00:00:00.000Z'),
        mk('d', 'x', '2026-01-02T00:00:00.000Z'),
        mk('c', 'x', '2026-01-02T00:00:00.000Z'),
        mk('e', 'y', '2026-01-01T00:00:00.000Z'),
      ]);

      const map = service.byLocation();
      expect(map.get('x')!.map((c) => c.id)).toEqual(['b', 'c', 'd', 'a']);
      expect(map.get('y')!.map((c) => c.id)).toEqual(['e']);
      expect(map.get('none')).toBeUndefined();
    });
  });

  it('reloads persisted cards on a fresh service instance', async () => {
    service.add(baseCard);
    await service.flush();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(CardService);
    await reloaded.load('p1');

    expect(reloaded.cards().length).toBe(1);
  });

  describe('applyRemoved', () => {
    it('removes the matching cards from the signal without touching IndexedDB', async () => {
      const kept = service.add(baseCard);
      const removed = service.add(mockCardEntryWithoutId({ name: 'Lightning Bolt' }));
      await service.flush();

      service.applyRemoved(new Set([removed.id]));

      expect(service.cards()).toEqual([kept]);
      expect(service.changeCount()).toBe(2);
      await service.flush();
      expect((await getAllFromStore<CardEntry>('cards')).map((c) => c.id).sort()).toEqual(
        [kept.id, removed.id].sort(),
      );
    });
  });

  describe('applyMoved', () => {
    it('updates locationId and updatedAt on matching cards in the signal only', async () => {
      const moved = service.add(baseCard);
      const untouched = service.add(mockCardEntryWithoutId({ name: 'Lightning Bolt' }));
      await service.flush();

      service.applyMoved(new Set([moved.id]), 'collection-2', '2026-02-01T00:00:00.000Z');

      expect(service.cards()).toEqual([
        { ...moved, locationId: 'collection-2', updatedAt: '2026-02-01T00:00:00.000Z' },
        untouched,
      ]);
      expect(service.changeCount()).toBe(2);
      await service.flush();
      const persisted = await getAllFromStore<CardEntry>('cards');
      expect(persisted.find((c) => c.id === moved.id)?.locationId).toBe(moved.locationId);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockCardEntry, mockCardEntryWithoutId } from '@testing/card.mocks';
import { otherCopy, settleChannel } from '@testing/cross-tab';
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
    expect(await getAllFromStore<CardEntry>('cards')).toHaveLength(2);
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
      await settleChannel();
      expect(other.received).toEqual([{ kind: 'cards', profileId: 'p1' }]);

      service.applySyncResult([]);
      await service.flush();
      await settleChannel();
      expect(other.received).toHaveLength(2);
    });

    it('refreshes in place when another copy saves, counting no change', async () => {
      const mine = service.add(baseCard);
      await service.flush();
      const count = service.changeCount();
      const theirs = mockCardEntry({ id: 'theirs' });
      await writeElsewhere([theirs]);

      const delivered = other.announce('cards', 'p1');
      expect(service.cards()).toEqual([mine]);
      await delivered;
      await vi.waitFor(() => expect(service.cards()).toHaveLength(2));
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

  it('removes a card', async () => {
    const added = service.add(baseCard);

    service.remove(added.id);

    expect(service.cards()).toEqual([]);
    await service.flush();
    expect(await getAllFromStore<CardEntry>('cards')).toEqual([]);
  });

  it('stamps updatedAt on add and bumps it on update', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const added = service.add(baseCard);
    expect(added.updatedAt).toBe('2026-01-01T00:00:00.000Z');

    vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    service.update(added.id, { quantity: 2 });

    expect(service.byId(added.id)()!.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    vi.useRealTimers();
  });

  it('records a tombstone on remove and lets it be cleared', async () => {
    const added = service.add(baseCard);

    service.remove(added.id);
    await service.flush();

    expect((await service.getTombstones()).map((t) => t.id)).toEqual([added.id]);

    await service.clearTombstones([added.id]);

    expect(await service.getTombstones()).toEqual([]);
  });

  it('applySyncResult replaces state verbatim without touching tombstones', async () => {
    const added = service.add(baseCard);
    service.remove(added.id);
    await service.flush();

    service.applySyncResult([added]);

    expect(service.cards()).toEqual([added]);
    expect((await service.getTombstones()).map((t) => t.id)).toEqual([added.id]);
  });

  it('finds a card by id', () => {
    const added = service.add(baseCard);

    expect(service.byId(added.id)()).toEqual(added);
    expect(service.byId('missing')()).toBeUndefined();
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

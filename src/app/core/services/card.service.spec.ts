import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { getAllFromStore } from '../db/entity-store';
import { CardEntry } from '@models/card.model';
import { CardService } from './card.service';

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

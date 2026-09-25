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

  describe('search', () => {
    it('returns no matches under 3 characters, even if it would otherwise match', () => {
      service.add(mockCardEntryWithoutId({ name: 'Sol Ring' }));

      expect(service.search('so')).toEqual([]);
    });

    it('matches by name, set code or collector number across the whole collection', () => {
      const sol = service.add(mockCardEntryWithoutId({ name: 'Sol Ring', setCode: 'LTC' }));
      service.add(mockCardEntryWithoutId({ name: 'Lightning Bolt', setCode: 'LEA' }));

      expect(service.search('sol')).toEqual([sol]);
      expect(service.search('ltc')).toEqual([sol]);
    });

    it('is diacritic- and case-insensitive', () => {
      const sol = service.add(mockCardEntryWithoutId({ name: 'Sol Ring' }));

      expect(service.search('SÓL')).toEqual([sol]);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { CardService } from './card.service';

const baseCard = mockCardEntryWithoutId();

describe('CardService', () => {
  let service: CardService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CardService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts empty when nothing is persisted', () => {
    expect(service.cards()).toEqual([]);
  });

  it('adds a card and persists it to localStorage', () => {
    const added = service.add(baseCard);

    expect(service.cards()).toEqual([added]);
    const raw = localStorage.getItem('grimorio.cards');
    expect(JSON.parse(raw!)).toEqual([added]);
  });

  it('updates a card in place', () => {
    const added = service.add(baseCard);

    service.update(added.id, { quantity: 4, forSale: true });

    expect(service.cards()[0]).toEqual({ ...added, quantity: 4, forSale: true });
  });

  it('removes a card', () => {
    const added = service.add(baseCard);

    service.remove(added.id);

    expect(service.cards()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('grimorio.cards')!)).toEqual([]);
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

  it('records a tombstone on remove and lets it be cleared', () => {
    const added = service.add(baseCard);

    service.remove(added.id);

    expect(service.getTombstones().map((t) => t.id)).toEqual([added.id]);

    service.clearTombstones([added.id]);

    expect(service.getTombstones()).toEqual([]);
  });

  it('applySyncResult replaces state verbatim without touching tombstones', () => {
    const added = service.add(baseCard);
    service.remove(added.id);

    service.applySyncResult([added]);

    expect(service.cards()).toEqual([added]);
    expect(service.getTombstones().map((t) => t.id)).toEqual([added.id]);
  });

  it('finds a card by id', () => {
    const added = service.add(baseCard);

    expect(service.byId(added.id)()).toEqual(added);
    expect(service.byId('missing')()).toBeUndefined();
  });

  it('reloads persisted cards on a fresh service instance', () => {
    service.add(baseCard);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(CardService);

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

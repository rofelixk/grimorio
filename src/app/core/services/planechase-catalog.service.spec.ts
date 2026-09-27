import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLANAR_DATA, PLANAR_TRANSLATIONS } from '@testing/planechase-fixtures';
import { PLANECHASE_DATA, PlanechaseCatalogService } from './planechase-catalog.service';

describe('PlanechaseCatalogService', () => {
  let loadData: ReturnType<typeof vi.fn>;
  let catalog: PlanechaseCatalogService;

  beforeEach(() => {
    loadData = vi.fn().mockResolvedValue({ cards: PLANAR_DATA, translations: PLANAR_TRANSLATIONS });
    TestBed.configureTestingModule({ providers: [{ provide: PLANECHASE_DATA, useValue: loadData }] });
    catalog = TestBed.inject(PlanechaseCatalogService);
  });

  it('is empty until loaded, then keeps the file order', async () => {
    expect(catalog.cards()).toEqual([]);
    await catalog.load();
    expect(catalog.cards().map((card) => card.id)).toEqual(PLANAR_DATA.cards.map((card) => card.id));
  });

  it('loads the data only once', async () => {
    await Promise.all([catalog.load(), catalog.load()]);
    await catalog.load();
    expect(loadData).toHaveBeenCalledTimes(1);
  });

  it('uses a fresh translation', async () => {
    await catalog.load();
    const card = catalog.byId('p01')!;
    expect(card.translated).toBe(true);
    expect(card.typeLine).toBe('Plano — Mundo p01');
    expect(card.ability).toBe('Sempre que o caos se instaurar, p01 faz algo.');
    expect(card.name).toBe('Card P01');
  });

  it('falls back to English when the translation is missing or stale', async () => {
    await catalog.load();
    for (const id of ['p09', 'p10']) {
      const card = catalog.byId(id)!;
      expect(card.translated).toBe(false);
      expect(card.typeLine).toBe(`Plane — World ${id}`);
      expect(card.ability).toBe(`Whenever chaos ensues, ${id} does a thing.`);
    }
  });

  it('keeps a plane with no chaos ability as null', async () => {
    await catalog.load();
    expect(catalog.byId('p11')!.ability).toBeNull();
  });

  it('groups sets in file order and knows each kind', async () => {
    await catalog.load();
    expect(catalog.sets().map((set) => [set.code, set.name, set.cards.length])).toEqual([
      ['nws', 'New Set', 7],
      ['old', 'Old Set', 7],
    ]);
    expect(catalog.kindOf('f01')).toBe('phenomenon');
    expect(catalog.kindOf('p01')).toBe('plane');
  });

  it('can retry after a failed load', async () => {
    loadData.mockRejectedValueOnce(new Error('chunk'));
    await expect(catalog.load()).rejects.toThrow('chunk');
    await catalog.load();
    expect(catalog.cards()).toHaveLength(PLANAR_DATA.cards.length);
  });
});

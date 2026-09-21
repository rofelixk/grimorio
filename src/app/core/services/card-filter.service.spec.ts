import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CardEntry } from '@models/card.model';
import { mockCardEntry } from '@testing/card.mocks';
import { CardFilterService, EMPTY_FILTERS, applyCardFilters } from './card-filter.service';

describe('CardFilterService', () => {
  let service: CardFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CardFilterService);
  });

  it('starts with empty filters, closed panel, and no open menu', () => {
    expect(service.filters()).toEqual(EMPTY_FILTERS);
    expect(service.panelOpen()).toBe(false);
    expect(service.openMenu()).toBe('');
    expect(service.activeCount()).toBe(0);
    expect(service.isActive()).toBe(false);
  });

  describe('activeCount / isActive', () => {
    it('counts each non-empty filter field as one group', () => {
      service.setField('forSale', true);
      expect(service.activeCount()).toBe(1);
      expect(service.isActive()).toBe(true);

      service.toggleListOption('rarity', 'rare');
      expect(service.activeCount()).toBe(2);

      service.toggleListOption('finish', 'foil');
      expect(service.activeCount()).toBe(3);

      service.toggleListOption('condition', 'NM');
      expect(service.activeCount()).toBe(4);

      service.toggleListOption('type', 'Instant');
      expect(service.activeCount()).toBe(5);
    });

    it('counts multiple selections within the same list field as one group', () => {
      service.toggleListOption('rarity', 'rare');
      expect(service.activeCount()).toBe(1);

      service.toggleListOption('rarity', 'mythic');
      expect(service.activeCount()).toBe(1);
    });

    it('counts colors + colorless together as a single group', () => {
      service.toggleColor('R');
      expect(service.activeCount()).toBe(1);

      service.toggleColor('U');
      expect(service.activeCount()).toBe(1);

      service.setField('colorless', true);
      expect(service.activeCount()).toBe(1);

      service.setField('colors', []);
      expect(service.activeCount()).toBe(1);

      service.setField('colorless', false);
      expect(service.activeCount()).toBe(0);
      expect(service.isActive()).toBe(false);
    });
  });

  describe('apply() predicates', () => {
    const cards: CardEntry[] = [
      mockCardEntry({
        id: 'a',
        forSale: true,
        rarity: 'rare',
        finish: 'foil',
        condition: 'NM',
        setCode: 'LEA',
        typeLine: 'Creature — Human Wizard',
        colorIdentity: ['R'],
      }),
      mockCardEntry({
        id: 'b',
        forSale: false,
        rarity: 'common',
        finish: 'nonfoil',
        condition: 'LP',
        setCode: 'M20',
        typeLine: 'Instant',
        colorIdentity: ['U'],
      }),
    ];

    it('filters by forSale', () => {
      const result = applyCardFilters(cards, { ...EMPTY_FILTERS, forSale: true });
      expect(result.map((c) => c.id)).toEqual(['a']);
    });

    it('filters by rarity', () => {
      const result = applyCardFilters(cards, { ...EMPTY_FILTERS, rarity: ['common'] });
      expect(result.map((c) => c.id)).toEqual(['b']);
    });

    it('filters by multiple rarities with OR semantics', () => {
      const result = applyCardFilters(cards, { ...EMPTY_FILTERS, rarity: ['common', 'rare'] });
      expect(result.map((c) => c.id).sort()).toEqual(['a', 'b']);
    });

    it('filters by finish', () => {
      const result = applyCardFilters(cards, { ...EMPTY_FILTERS, finish: ['foil'] });
      expect(result.map((c) => c.id)).toEqual(['a']);
    });

    it('filters by condition', () => {
      const result = applyCardFilters(cards, { ...EMPTY_FILTERS, condition: ['LP'] });
      expect(result.map((c) => c.id)).toEqual(['b']);
    });

    it('filters by type with case-insensitive substring match, OR across selections', () => {
      const result = applyCardFilters(cards, { ...EMPTY_FILTERS, type: ['instant'] });
      expect(result.map((c) => c.id)).toEqual(['b']);

      const both = applyCardFilters(cards, { ...EMPTY_FILTERS, type: ['instant', 'creature'] });
      expect(both.map((c) => c.id).sort()).toEqual(['a', 'b']);
    });
  });

  describe('color matching', () => {
    const redCard = mockCardEntry({ id: 'red', colorIdentity: ['R'] });
    const rugCard = mockCardEntry({ id: 'rug', colorIdentity: ['R', 'U', 'G'] });
    const colorlessCard = mockCardEntry({ id: 'colorless', colorIdentity: [] });
    const cards = [redCard, rugCard, colorlessCard];

    it('any: matches cards containing any selected color', () => {
      const result = applyCardFilters(cards, { ...EMPTY_FILTERS, colorMatch: 'any', colors: ['R'] });
      expect(result.map((c) => c.id).sort()).toEqual(['red', 'rug']);
    });

    it('any: colorless + colors matches either', () => {
      const result = applyCardFilters(cards, {
        ...EMPTY_FILTERS,
        colorMatch: 'any',
        colors: ['R'],
        colorless: true,
      });
      expect(result.map((c) => c.id).sort()).toEqual(['colorless', 'red', 'rug']);
    });

    it('any: no filtering applied when colors empty and colorless false', () => {
      const result = applyCardFilters(cards, { ...EMPTY_FILTERS, colorMatch: 'any' });
      expect(result).toEqual(cards);
    });

    it('exact: matches only cards whose identity equals the selected colors exactly', () => {
      const result = applyCardFilters(cards, { ...EMPTY_FILTERS, colorMatch: 'exact', colors: ['R'] });
      expect(result.map((c) => c.id)).toEqual(['red']);
    });

    it('exact: multi-color selection requires exact identity match', () => {
      const result = applyCardFilters(cards, {
        ...EMPTY_FILTERS,
        colorMatch: 'exact',
        colors: ['R', 'U', 'G'],
      });
      expect(result.map((c) => c.id)).toEqual(['rug']);
    });

    it('exact: colorless-only requires empty colorIdentity', () => {
      const result = applyCardFilters(cards, { ...EMPTY_FILTERS, colorMatch: 'exact', colorless: true });
      expect(result.map((c) => c.id)).toEqual(['colorless']);
    });

    it('exact: colorless alongside non-empty colors has no additional effect', () => {
      const result = applyCardFilters(cards, {
        ...EMPTY_FILTERS,
        colorMatch: 'exact',
        colors: ['R'],
        colorless: true,
      });
      expect(result.map((c) => c.id)).toEqual(['red']);
    });
  });

  describe('reset()', () => {
    it('resets filters but not panelOpen/openMenu', () => {
      service.setField('forSale', true);
      service.panelOpen.set(true);
      service.openMenu.set('rarity');

      service.reset();

      expect(service.filters()).toEqual(EMPTY_FILTERS);
      expect(service.panelOpen()).toBe(true);
      expect(service.openMenu()).toBe('rarity');
    });
  });

  describe('setField()', () => {
    it('updates a single field immutably', () => {
      const before = service.filters();
      service.setField('type', ['Instant']);

      expect(service.filters()).toEqual({ ...EMPTY_FILTERS, type: ['Instant'] });
      expect(service.filters()).not.toBe(before);
    });
  });

  describe('toggleColor()', () => {
    it('adds a color not yet present', () => {
      service.toggleColor('R');
      expect(service.filters().colors).toEqual(['R']);
    });

    it('removes a color already present', () => {
      service.toggleColor('R');
      service.toggleColor('U');
      service.toggleColor('R');
      expect(service.filters().colors).toEqual(['U']);
    });
  });

  describe('toggleListOption()', () => {
    it('adds a value not yet present in the field', () => {
      service.toggleListOption('rarity', 'rare');
      expect(service.filters().rarity).toEqual(['rare']);
    });

    it('removes a value already present in the field', () => {
      service.toggleListOption('rarity', 'rare');
      service.toggleListOption('rarity', 'mythic');
      service.toggleListOption('rarity', 'rare');
      expect(service.filters().rarity).toEqual(['mythic']);
    });

    it('keeps other list fields untouched', () => {
      service.toggleListOption('rarity', 'rare');
      service.toggleListOption('finish', 'foil');
      expect(service.filters().rarity).toEqual(['rare']);
      expect(service.filters().finish).toEqual(['foil']);
    });
  });

  describe('clearListField()', () => {
    it('resets just the given field to an empty array', () => {
      service.toggleListOption('rarity', 'rare');
      service.toggleListOption('finish', 'foil');

      service.clearListField('rarity');

      expect(service.filters().rarity).toEqual([]);
      expect(service.filters().finish).toEqual(['foil']);
    });
  });
});

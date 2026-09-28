import { describe, expect, it } from 'vitest';
import type { PlanarCard, PlanarCardData } from '../data/planechase/planar-card.model';
import shippedCards from '../data/planechase/cards.json';
import { DEFAULT_OFF_IDS } from '../data/planechase/default-off';
import { buildCatalog } from '@services/planechase-catalog.service';
import { PLANAR_CARDS } from '@testing/planechase-fixtures';
import { enabledCards, initialDisabledIds, sameEnabledSet, validateSelection } from './planar-selection.util';

function cards(planes: number, phenomena: number): PlanarCard[] {
  const make = (kind: PlanarCard['kind'], i: number): PlanarCard => ({
    ...PLANAR_CARDS[0],
    id: `${kind}-${i}`,
    kind,
  });
  return [
    ...Array.from({ length: planes }, (_, i) => make('plane', i)),
    ...Array.from({ length: phenomena }, (_, i) => make('phenomenon', i)),
  ];
}

describe('enabledCards', () => {
  it('leaves out exactly the default-off cards with no saved selection', () => {
    const [otaria, lethe] = [DEFAULT_OFF_IDS[0], DEFAULT_OFF_IDS[6]];
    const catalog = [...PLANAR_CARDS, { ...PLANAR_CARDS[0], id: otaria }, { ...PLANAR_CARDS[1], id: lethe }];
    expect(enabledCards(catalog, null)).toEqual(PLANAR_CARDS);
  });

  it('ignores the default list once a selection is saved', () => {
    const otaria = { ...PLANAR_CARDS[0], id: DEFAULT_OFF_IDS[0] };
    const enabled = enabledCards([...PLANAR_CARDS, otaria], { disabledIds: [], updatedAt: 'x' });
    expect(enabled).toContain(otaria);
    expect(enabled).toHaveLength(PLANAR_CARDS.length + 1);
  });

  it('drops disabled ids and ignores unknown ones', () => {
    const enabled = enabledCards(PLANAR_CARDS, { disabledIds: ['p01', 'f02', 'gone'], updatedAt: 'x' });
    expect(enabled.map((card) => card.id)).not.toContain('p01');
    expect(enabled.map((card) => card.id)).not.toContain('f02');
    expect(enabled).toHaveLength(PLANAR_CARDS.length - 2);
  });
});

describe('initialDisabledIds', () => {
  it('is the default list with nothing saved', () => {
    expect(initialDisabledIds(null)).toEqual([...DEFAULT_OFF_IDS]);
  });

  it('is the saved list otherwise, even when empty', () => {
    expect(initialDisabledIds({ disabledIds: ['p01'], updatedAt: 'x' })).toEqual(['p01']);
    expect(initialDisabledIds({ disabledIds: [], updatedAt: 'x' })).toEqual([]);
  });
});

describe('the default-off list against the shipped catalog', () => {
  const catalog = buildCatalog({ cards: shippedCards as PlanarCardData, translations: {} });

  it('names only cards that exist', () => {
    const ids = new Set(catalog.map((card) => card.id));
    for (const id of DEFAULT_OFF_IDS) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it('leaves a deck that can start (≥ 10 cards, ≥ 1 plane)', () => {
    const enabled = enabledCards(catalog, null);
    expect(enabled).toHaveLength(catalog.length - DEFAULT_OFF_IDS.length);
    expect(validateSelection(enabled).ok).toBe(true);
  });
});

describe('validateSelection', () => {
  it('refuses fewer than 10 cards, even with no plane', () => {
    expect(validateSelection(cards(9, 0))).toEqual({ ok: false, error: 'tooFew', count: 9 });
    expect(validateSelection(cards(0, 3))).toEqual({ ok: false, error: 'tooFew', count: 3 });
  });

  it('refuses 10+ cards with no plane', () => {
    expect(validateSelection(cards(0, 10))).toEqual({ ok: false, error: 'noPlane' });
  });

  it('accepts with a notice under 40 cards', () => {
    expect(validateSelection(cards(10, 0))).toEqual({ ok: true, notice: true });
    expect(validateSelection(cards(37, 2))).toEqual({ ok: true, notice: true });
  });

  it('accepts with a notice over 2 phenomena', () => {
    expect(validateSelection(cards(40, 3))).toEqual({ ok: true, notice: true });
  });

  it('accepts without a notice at 40+ cards and at most 2 phenomena', () => {
    expect(validateSelection(cards(38, 2))).toEqual({ ok: true, notice: false });
  });
});

describe('sameEnabledSet', () => {
  it('ignores order', () => {
    expect(sameEnabledSet(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(true);
  });

  it('detects a changed set', () => {
    expect(sameEnabledSet(['a', 'b'], ['a', 'c'])).toBe(false);
    expect(sameEnabledSet(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
  });
});

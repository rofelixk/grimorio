import { describe, expect, it } from 'vitest';
import type { PlanarCard } from '../data/planechase/planar-card.model';
import { PLANAR_CARDS } from '@testing/planechase-fixtures';
import { enabledCards, sameEnabledSet, validateSelection } from './planar-selection.util';

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
  it('enables every card with no saved selection', () => {
    expect(enabledCards(PLANAR_CARDS, null)).toEqual(PLANAR_CARDS);
  });

  it('drops disabled ids and ignores unknown ones', () => {
    const enabled = enabledCards(PLANAR_CARDS, { disabledIds: ['p01', 'f02', 'gone'], updatedAt: 'x' });
    expect(enabled.map((card) => card.id)).not.toContain('p01');
    expect(enabled.map((card) => card.id)).not.toContain('f02');
    expect(enabled).toHaveLength(PLANAR_CARDS.length - 2);
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

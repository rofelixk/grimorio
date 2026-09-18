import { describe, expect, it } from 'vitest';
import { mockCardEntry } from '@testing/card.mocks';
import { countCardsInLocations } from './location-cards.util';

describe('countCardsInLocations', () => {
  it('returns 0 for an empty card list', () => {
    expect(countCardsInLocations([], ['loc-1'])).toBe(0);
  });

  it('sums quantity for cards in any of the given locations', () => {
    const cards = [
      mockCardEntry({ id: 'a', locationId: 'loc-1', quantity: 2 }),
      mockCardEntry({ id: 'b', locationId: 'loc-2', quantity: 3 }),
      mockCardEntry({ id: 'c', locationId: 'loc-3', quantity: 5 }),
    ];

    expect(countCardsInLocations(cards, ['loc-1', 'loc-2'])).toBe(5);
  });

  it('ignores cards outside the given locations', () => {
    const cards = [mockCardEntry({ id: 'a', locationId: 'loc-1', quantity: 4 })];

    expect(countCardsInLocations(cards, ['loc-2'])).toBe(0);
  });

  it('deduplicates overlapping location ids', () => {
    const cards = [mockCardEntry({ id: 'a', locationId: 'loc-1', quantity: 4 })];

    expect(countCardsInLocations(cards, ['loc-1', 'loc-1'])).toBe(4);
  });
});

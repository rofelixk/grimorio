import { CardEntry } from '@models/card.model';

// Sums the quantity of every card whose locationId is in the given set —
// callers pass a location's own id plus its descendant ids to count a whole
// subtree, or just the one id to count a single location.
export function countCardsInLocations(
  cards: CardEntry[],
  locationIds: Iterable<string>,
): number {
  const ids = new Set(locationIds);
  return cards
    .filter((card) => ids.has(card.locationId))
    .reduce((total, card) => total + card.quantity, 0);
}

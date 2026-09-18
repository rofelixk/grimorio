import { CardEntry } from '@models/card.model';

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

// Matches a query against a card's name, set code and collector number —
// the three fields a physical card is realistically looked up by.
export function matchesCardQuery(card: CardEntry, query: string): boolean {
  const q = normalizeSearchText(query);
  return (
    normalizeSearchText(card.name).includes(q) ||
    normalizeSearchText(card.setCode).includes(q) ||
    normalizeSearchText(card.collectorNumber).includes(q)
  );
}

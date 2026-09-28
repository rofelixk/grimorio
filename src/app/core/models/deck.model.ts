// Deck model (spec 009): a physical deck, a card location next to collections.
// The record stays small — identity, name, format and change time only (FR-011). Cards placed in a
// deck carry its id in `CardEntry.locationId`; counts are derived, never stored.

/** The formats, in display order (FR-003). Names and rules are copy (`DECK.formats`). */
export const DECK_FORMATS = ['commander', 'pauper', 'modern', 'standard', 'pioneer', 'legacy', 'vintage', 'casual'] as const;

export type DeckFormatId = (typeof DECK_FORMATS)[number];

export const DEFAULT_FORMAT: DeckFormatId = 'commander';

export interface Deck {
  id: string;
  name: string;
  format: DeckFormatId;
  updatedAt: string;
}

export type DeckNameError = 'empty' | 'too-long' | 'taken';

/** A stored format id, falling back to Casual for an id this build doesn't know. */
export function formatOf(id: string): DeckFormatId {
  return (DECK_FORMATS as readonly string[]).includes(id) ? (id as DeckFormatId) : 'casual';
}

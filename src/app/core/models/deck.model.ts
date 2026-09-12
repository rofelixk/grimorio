import { CardEntry } from './card.model';

export type DeckCardIdentity = Omit<
  CardEntry,
  'id' | 'quantity' | 'condition' | 'locationId' | 'forSale' | 'notes' | 'language'
>;

export type DeckCard =
  | { id: string; source: 'owned'; cardEntryId: string }
  | { id: string; source: 'freeBuild'; card: DeckCardIdentity };

export interface Deck {
  id: string;
  name: string;
  commander: DeckCard | null;
  cards: DeckCard[];
}

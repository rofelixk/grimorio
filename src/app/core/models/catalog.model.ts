import type { CardFace, Color, CommanderLegality } from './card.model';

export interface CatalogCard {
  oracleId: string;
  name: string;
  typeLine: string;
  colorIdentity: Color[];
  imageUrl: string | null;
}

export interface CatalogPrinting {
  scryfallId: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: string;
  lang: string;
  releasedAt: string | null;
  imageUrl: string | null;
  imageSmall: string | null;
  artist: string | null;
  faces: CardFace[] | null;
}

export interface CatalogCardDetail extends CatalogCard {
  oracleText: string | null;
  commanderLegality: CommanderLegality;
  cardFaces: { oracleText: string }[] | null;
  printings: CatalogPrinting[];
}

export interface SearchPage {
  cards: CatalogCard[];
  hasMore: boolean;
}

export class CatalogError extends Error {
  constructor(readonly kind: 'offline' | 'failed') {
    super(kind);
    this.name = 'CatalogError';
  }
}

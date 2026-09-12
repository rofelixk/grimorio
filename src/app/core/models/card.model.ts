export type CardFinish = 'nonfoil' | 'foil' | 'etched';
export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'special' | 'mythic' | 'bonus';
export type CommanderLegality = 'legal' | 'not_legal' | 'banned' | 'restricted';
export type Color = 'W' | 'U' | 'B' | 'R' | 'G';

export interface CardFace {
  name: string;
  imageUrl: string;
}

export interface CardEntry {
  id: string;
  scryfallId: string;
  oracleId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  rarity: CardRarity;
  commanderLegality: CommanderLegality;
  colorIdentity: Color[];
  typeLine: string;
  canBeCommander: boolean;
  finish: CardFinish;
  language: string;
  condition: CardCondition;
  quantity: number;
  locationId: string;
  forSale: boolean;
  imageUrl: string;
  faces?: CardFace[];
  notes?: string;
}

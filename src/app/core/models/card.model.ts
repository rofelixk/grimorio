type CardFinish = 'nonfoil' | 'foil' | 'etched';
type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
type CardRarity = 'common' | 'uncommon' | 'rare' | 'special' | 'mythic' | 'bonus';
type CommanderLegality = 'legal' | 'not_legal' | 'banned' | 'restricted';
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
  updatedAt: string;
}

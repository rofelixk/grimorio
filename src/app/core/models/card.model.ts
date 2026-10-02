export type CardFinish = 'nonfoil' | 'foil' | 'etched';
export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
type CardRarity = 'common' | 'uncommon' | 'rare' | 'special' | 'mythic' | 'bonus';
export type CommanderLegality = 'legal' | 'not_legal' | 'banned' | 'restricted';
export type Color = 'W' | 'U' | 'B' | 'R' | 'G';

export const CARD_FINISHES: readonly CardFinish[] = ['nonfoil', 'foil', 'etched'];
export const CARD_CONDITIONS: readonly CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG'];

/** Scryfall language codes, in the order the form lists them (English first). */
export const CARD_LANGUAGES: readonly { code: string; name: string; label: string }[] = [
  { code: 'en', name: 'Inglês', label: 'EN' },
  { code: 'pt', name: 'Português', label: 'PT' },
  { code: 'sp', name: 'Espanhol', label: 'ES' },
  { code: 'fr', name: 'Francês', label: 'FR' },
  { code: 'de', name: 'Alemão', label: 'DE' },
  { code: 'it', name: 'Italiano', label: 'IT' },
  { code: 'jp', name: 'Japonês', label: 'JP' },
  { code: 'kr', name: 'Coreano', label: 'KO' },
  { code: 'ru', name: 'Russo', label: 'RU' },
  { code: 'cs', name: 'Chinês simplificado', label: 'ZHS' },
  { code: 'ct', name: 'Chinês tradicional', label: 'ZHT' },
];

/** Typo guard for one row's quantity; merges may exceed it. */
export const MAX_QUANTITY = 9999;

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
  artist?: string;
  notes?: string;
  addedAt: string;
  updatedAt: string;
}

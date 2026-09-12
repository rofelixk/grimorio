import { Injectable } from '@angular/core';
import { CardEntry, CardRarity, Color } from '../models/card.model';

export type CardLookupResult = Pick<
  CardEntry,
  | 'name'
  | 'scryfallId'
  | 'oracleId'
  | 'setName'
  | 'rarity'
  | 'commanderLegality'
  | 'colorIdentity'
  | 'typeLine'
  | 'canBeCommander'
  | 'imageUrl'
  | 'faces'
>;

const RARITIES: CardRarity[] = ['common', 'uncommon', 'rare', 'mythic'];
const COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];
const TYPE_LINES = [
  'Creature — Human Soldier',
  'Legendary Creature — Vampire Cleric',
  'Legendary Artifact Creature — Golem',
  'Instant',
  'Sorcery',
  'Legendary Planeswalker — Kaya',
];

function randomColorIdentity(): Color[] {
  return COLORS.filter(() => Math.random() < 0.35);
}

function randomTypeLine(): string {
  return TYPE_LINES[Math.floor(Math.random() * TYPE_LINES.length)];
}

@Injectable({ providedIn: 'root' })
export class CardLookupService {
  async lookup(setCode: string, collectorNumber: string): Promise<CardLookupResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const set = setCode.trim().toUpperCase();
    const number = collectorNumber.trim();
    const typeLine = randomTypeLine();
    const isLegendary = typeLine.startsWith('Legendary');
    const isPlaneswalker = typeLine.includes('Planeswalker');

    return {
      name: `Card ${set} #${number}`,
      scryfallId: crypto.randomUUID(),
      oracleId: crypto.randomUUID(),
      setName: `${set} Set`,
      rarity: RARITIES[Math.floor(Math.random() * RARITIES.length)],
      commanderLegality: 'legal',
      colorIdentity: randomColorIdentity(),
      typeLine,
      canBeCommander: isLegendary || (isPlaneswalker && Math.random() < 0.5),
      imageUrl: `https://placehold.co/223x310?text=${encodeURIComponent(`${set} #${number}`)}`,
      faces: undefined,
    };
  }
}

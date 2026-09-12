import { Injectable } from '@angular/core';
import { CardEntry, CardRarity } from '../models/card.model';

export type CardLookupResult = Pick<
  CardEntry,
  'name' | 'scryfallId' | 'oracleId' | 'setName' | 'rarity' | 'commanderLegality' | 'imageUrl' | 'faces'
>;

const RARITIES: CardRarity[] = ['common', 'uncommon', 'rare', 'mythic'];

@Injectable({ providedIn: 'root' })
export class CardLookupService {
  async lookup(setCode: string, collectorNumber: string): Promise<CardLookupResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const set = setCode.trim().toUpperCase();
    const number = collectorNumber.trim();

    return {
      name: `Card ${set} #${number}`,
      scryfallId: crypto.randomUUID(),
      oracleId: crypto.randomUUID(),
      setName: `${set} Set`,
      rarity: RARITIES[Math.floor(Math.random() * RARITIES.length)],
      commanderLegality: 'legal',
      imageUrl: `https://placehold.co/223x310?text=${encodeURIComponent(`${set} #${number}`)}`,
      faces: undefined,
    };
  }
}

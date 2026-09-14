import { CardEntry } from '@models/card.model';
import { CardLookupResult } from '@services/card-lookup.service';

export function mockCardEntry(overrides: Partial<CardEntry> = {}): CardEntry {
  return {
    id: 'card-1',
    scryfallId: '909a52bc-53f6-4654-9db7-e8f48333d765',
    oracleId: '25877c41-39a4-4cc3-ac4b-8f3dd06d579b',
    name: 'Lightning Bolt',
    setCode: 'LEA',
    setName: 'Limited Edition Alpha',
    collectorNumber: '161',
    rarity: 'common',
    commanderLegality: 'legal',
    colorIdentity: ['R'],
    typeLine: 'Instant',
    canBeCommander: false,
    finish: 'nonfoil',
    language: 'en',
    condition: 'NM',
    quantity: 1,
    locationId: 'loc-1',
    forSale: false,
    imageUrl: 'https://cards.scryfall.io/normal/front/9/0/909a52bc-53f6-4654-9db7-e8f48333d765.jpg',
    ...overrides,
  };
}

export function mockCardEntryWithoutId(overrides: Partial<CardEntry> = {}): Omit<CardEntry, 'id'> {
  const { id, ...rest } = mockCardEntry(overrides);
  void id;
  return rest;
}

export function mockCardLookupResult(overrides: Partial<CardLookupResult> = {}): CardLookupResult {
  const card = mockCardEntry(overrides);
  return {
    name: card.name,
    scryfallId: card.scryfallId,
    oracleId: card.oracleId,
    setName: card.setName,
    rarity: card.rarity,
    commanderLegality: card.commanderLegality,
    colorIdentity: card.colorIdentity,
    typeLine: card.typeLine,
    canBeCommander: card.canBeCommander,
    imageUrl: card.imageUrl,
    faces: card.faces,
  };
}

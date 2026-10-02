import type { CardEntry, CardFace } from '@models/card.model';
import type { Collection, CollectionColorHex } from '@models/collection.model';
import { type Deck, formatOf } from '@models/deck.model';

export interface CardEntryRow {
  id: string;
  user_id: string;
  scryfall_id: string;
  oracle_id: string;
  name: string;
  set_code: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  commander_legality: string;
  color_identity: string[];
  type_line: string;
  can_be_commander: boolean;
  finish: string;
  language: string;
  condition: string;
  quantity: number;
  location_id: string;
  for_sale: boolean;
  image_url: string;
  faces: CardFace[] | null;
  artist: string | null;
  notes: string | null;
  added_at: string;
  updated_at: string;
}

export interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  color: CollectionColorHex;
  parent_id: string | null;
  updated_at: string;
}

export interface DeckRow {
  id: string;
  user_id: string;
  name: string;
  format: string;
  updated_at: string;
}

export function cardToRow(card: CardEntry, userId: string): CardEntryRow {
  return {
    id: card.id,
    user_id: userId,
    scryfall_id: card.scryfallId,
    oracle_id: card.oracleId,
    name: card.name,
    set_code: card.setCode,
    set_name: card.setName,
    collector_number: card.collectorNumber,
    rarity: card.rarity,
    commander_legality: card.commanderLegality,
    color_identity: card.colorIdentity,
    type_line: card.typeLine,
    can_be_commander: card.canBeCommander,
    finish: card.finish,
    language: card.language,
    condition: card.condition,
    quantity: card.quantity,
    location_id: card.locationId,
    for_sale: card.forSale,
    image_url: card.imageUrl,
    faces: card.faces ?? null,
    artist: card.artist ?? null,
    notes: card.notes ?? null,
    added_at: card.addedAt,
    updated_at: card.updatedAt,
  };
}

export function cardFromRow(row: CardEntryRow): CardEntry {
  return {
    id: row.id,
    scryfallId: row.scryfall_id,
    oracleId: row.oracle_id,
    name: row.name,
    setCode: row.set_code,
    setName: row.set_name,
    collectorNumber: row.collector_number,
    rarity: row.rarity as CardEntry['rarity'],
    commanderLegality: row.commander_legality as CardEntry['commanderLegality'],
    colorIdentity: row.color_identity as CardEntry['colorIdentity'],
    typeLine: row.type_line,
    canBeCommander: row.can_be_commander,
    finish: row.finish as CardEntry['finish'],
    language: row.language,
    condition: row.condition as CardEntry['condition'],
    quantity: row.quantity,
    locationId: row.location_id,
    forSale: row.for_sale,
    imageUrl: row.image_url,
    faces: row.faces ?? undefined,
    artist: row.artist ?? undefined,
    notes: row.notes ?? undefined,
    addedAt: new Date(row.added_at).toISOString(),
    updatedAt: row.updated_at,
  };
}

export function collectionToRow(collection: Collection, userId: string): CollectionRow {
  return {
    id: collection.id,
    user_id: userId,
    name: collection.name,
    color: collection.color,
    parent_id: collection.parentId,
    updated_at: new Date(collection.updatedAt).toISOString(),
  };
}

export function collectionFromRow(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    parentId: row.parent_id,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export function deckToRow(deck: Deck, userId: string): DeckRow {
  return {
    id: deck.id,
    user_id: userId,
    name: deck.name,
    format: deck.format,
    updated_at: new Date(deck.updatedAt).toISOString(),
  };
}

export function deckFromRow(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    format: formatOf(row.format),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

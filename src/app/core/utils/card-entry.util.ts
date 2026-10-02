// Pure rules of adding and editing an owned card (spec 015): the catalog data → `CardEntry` fields,
// the printing list order and filter, and the quantity check.

import {
  CARD_LANGUAGES,
  MAX_QUANTITY,
  type CardCondition,
  type CardEntry,
  type CardFace,
  type CardFinish,
} from '@models/card.model';
import type { CatalogCardDetail, CatalogPrinting } from '@models/catalog.model';
import { FINISH_NAMES } from './card-copy';
import { searchKey } from './card-search.util';

/** The fields a printing change replaces on an owned card. */
export type PrintingFields = Pick<
  CardEntry,
  | 'name'
  | 'scryfallId'
  | 'oracleId'
  | 'setCode'
  | 'setName'
  | 'collectorNumber'
  | 'rarity'
  | 'commanderLegality'
  | 'colorIdentity'
  | 'typeLine'
  | 'imageUrl'
  | 'faces'
  | 'artist'
>;

/** What the person fills in for the physical card. */
export interface OwnershipFields {
  finish: CardFinish;
  language: string;
  condition: CardCondition;
  quantity: number;
  forSale: boolean;
  notes?: string;
}

/** The type line has "Legendary" and "Creature", or an oracle text says it can be the commander (R11). */
export function canBeCommander(
  typeLine: string,
  oracleText: string | null,
  faces: { oracleText: string }[] | null,
): boolean {
  if (typeLine.includes('Legendary') && typeLine.includes('Creature')) {
    return true;
  }
  const text = oracleText ?? faces?.map((face) => face.oracleText).join('\n') ?? '';
  return text.toLowerCase().includes('can be your commander');
}

/** Newest release first, then set code, then collector number ("2" before "10"). */
export function sortPrintings(printings: readonly CatalogPrinting[]): CatalogPrinting[] {
  return [...printings].sort((a, b) => {
    if (a.releasedAt !== b.releasedAt) {
      if (a.releasedAt === null) return 1;
      if (b.releasedAt === null) return -1;
      return b.releasedAt.localeCompare(a.releasedAt);
    }
    return (
      a.setCode.localeCompare(b.setCode) ||
      a.collectorNumber.localeCompare(b.collectorNumber, undefined, { numeric: true })
    );
  });
}

/** The first English printing of the sorted list, else the first (R4). */
export function initialPrinting(printings: readonly CatalogPrinting[]): CatalogPrinting {
  return printings.find((printing) => printing.lang === 'en') ?? printings[0];
}

/** Printings whose set name contains the text, or whose set code starts with it; `keep` always stays. */
export function filterPrintings(
  printings: readonly CatalogPrinting[],
  text: string,
  keep: string,
): CatalogPrinting[] {
  const key = searchKey(text);
  if (!key) {
    return [...printings];
  }
  return printings.filter(
    (printing) =>
      printing.scryfallId === keep ||
      searchKey(printing.setName).includes(key) ||
      printing.setCode.toLowerCase().startsWith(key),
  );
}

function facesOf(printing: CatalogPrinting): CardFace[] | undefined {
  const faces = printing.faces;
  return faces && faces.filter((face) => face.imageUrl).length >= 2 ? faces : undefined;
}

export function printingIdentity(detail: CatalogCardDetail, printing: CatalogPrinting): PrintingFields {
  const faces = facesOf(printing);
  const identity: PrintingFields = {
    name: detail.name,
    scryfallId: printing.scryfallId,
    oracleId: detail.oracleId,
    setCode: printing.setCode.toUpperCase(),
    setName: printing.setName,
    collectorNumber: printing.collectorNumber,
    rarity: (printing.rarity || 'common') as CardEntry['rarity'],
    commanderLegality: detail.commanderLegality,
    colorIdentity: detail.colorIdentity,
    typeLine: detail.typeLine,
    imageUrl: printing.imageUrl ?? printing.faces?.[0]?.imageUrl ?? '',
    faces,
  };
  if (printing.artist) {
    identity.artist = printing.artist;
  }
  return identity;
}

export function entryFromPrinting(
  detail: CatalogCardDetail,
  printing: CatalogPrinting,
  details: OwnershipFields,
  locationId: string,
): Omit<CardEntry, 'id' | 'updatedAt' | 'addedAt'> {
  const notes = details.notes?.trim();
  return {
    ...printingIdentity(detail, printing),
    canBeCommander: canBeCommander(detail.typeLine, detail.oracleText, detail.cardFaces),
    finish: details.finish,
    language: details.language,
    condition: details.condition,
    quantity: details.quantity,
    forSale: details.forSale,
    notes: notes ? notes : undefined,
    locationId,
  };
}

export type QuantityResult = { ok: true; value: number } | { ok: false };

/** Only a whole number from 1 to 9.999 is accepted. */
export function validateQuantity(text: string): QuantityResult {
  if (!/^\d+$/.test(text)) {
    return { ok: false };
  }
  const value = Number(text);
  return value >= 1 && value <= MAX_QUANTITY ? { ok: true, value } : { ok: false };
}

/** "Foil · EN · NM". */
export function detailsLine(card: Pick<CardEntry, 'finish' | 'language' | 'condition'>): string {
  const language = CARD_LANGUAGES.find((l) => l.code === card.language)?.label ?? card.language.toUpperCase();
  return `${FINISH_NAMES[card.finish]} · ${language} · ${card.condition}`;
}

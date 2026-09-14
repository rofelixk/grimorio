import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase-client';
import { CardEntry, CardFace, CardRarity, CommanderLegality, Color } from '@models/card.model';

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

interface CardFaceRow {
  name: string;
  image_url: string | null;
}

interface CardRow {
  name: string;
  type_line: string;
  oracle_text: string | null;
  color_identity: string[];
  commander_legality: string;
  card_faces: CardFaceRow[] | null;
}

interface PrintingRow {
  scryfall_id: string;
  oracle_id: string;
  set_name: string | null;
  rarity: string | null;
  image_url: string | null;
  cards: CardRow;
}

@Injectable({ providedIn: 'root' })
export class CardLookupService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  async lookup(setCode: string, collectorNumber: string): Promise<CardLookupResult> {
    const { data, error } = await this.supabase
      .from('printings')
      .select(
        'scryfall_id, oracle_id, set_name, rarity, image_url, cards(name, type_line, oracle_text, color_identity, commander_legality, card_faces)',
      )
      .eq('set_code', setCode.trim().toLowerCase())
      .eq('collector_number', normalizeCollectorNumber(collectorNumber))
      .single();

    if (error) {
      throw error.code === 'PGRST116'
        ? new Error(`No card found for ${setCode.toUpperCase()} #${collectorNumber}.`)
        : new Error('Could not reach the card database. Check your connection and try again.');
    }

    return mapRow(data as unknown as PrintingRow);
  }
}

// Cards are often printed with zero-padded collector numbers (e.g. "0001"),
// but Scryfall stores them without the padding (e.g. "1") — strip leading
// zeros before querying, but only when followed by another digit, so
// non-numeric/suffixed numbers (e.g. "007a", or "0" itself) are preserved.
function normalizeCollectorNumber(collectorNumber: string): string {
  return collectorNumber.trim().replace(/^0+(?=\d)/, '');
}

function mapRow(row: PrintingRow): CardLookupResult {
  const card = row.cards;
  const oracleText =
    card.oracle_text ??
    (card.card_faces ?? [])
      .map((face) => (face as unknown as { oracle_text?: string }).oracle_text ?? '')
      .join('\n');
  const isLegendaryCreature = /Legendary/.test(card.type_line) && /Creature/.test(card.type_line);
  const canBeCommander =
    isLegendaryCreature || oracleText.toLowerCase().includes('can be your commander');

  return {
    name: card.name,
    scryfallId: row.scryfall_id,
    oracleId: row.oracle_id,
    setName: row.set_name ?? '',
    rarity: (row.rarity ?? 'common') as CardRarity,
    commanderLegality: card.commander_legality as CommanderLegality,
    colorIdentity: card.color_identity as Color[],
    typeLine: card.type_line,
    canBeCommander,
    imageUrl: row.image_url ?? card.card_faces?.[0]?.image_url ?? '',
    faces: mapFaces(card.card_faces),
  };
}

function mapFaces(faces: CardFaceRow[] | null): CardFace[] | undefined {
  if (!faces || faces.length < 2) {
    return undefined;
  }
  const withImages = faces.filter(
    (face): face is CardFaceRow & { image_url: string } => !!face.image_url,
  );
  return withImages.length > 0
    ? withImages.map((face) => ({ name: face.name, imageUrl: face.image_url }))
    : undefined;
}

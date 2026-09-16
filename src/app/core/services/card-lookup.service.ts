import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase-client';
import { CardEntry, CardFace, CardRarity, CommanderLegality, Color } from '@models/card.model';

export type CardLookupResult = Pick<
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
  set_code: string;
  set_name: string | null;
  collector_number: string;
  rarity: string | null;
  image_url: string | null;
  cards: CardRow;
}

const NAME_SEARCH_MIN_LENGTH = 3;
const NAME_SEARCH_LIMIT = 200;

@Injectable({ providedIn: 'root' })
export class CardLookupService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  async lookup(setCode: string, collectorNumber: string): Promise<CardLookupResult> {
    const { data, error } = await this.supabase
      .from('printings')
      .select(
        'scryfall_id, oracle_id, set_code, set_name, collector_number, rarity, image_url, cards(name, type_line, oracle_text, color_identity, commander_legality, card_faces)',
      )
      .eq('set_code', setCode.trim().toLowerCase())
      .eq('collector_number', normalizeCollectorNumber(collectorNumber))
      .single();

    if (error) {
      throw error.code === 'PGRST116'
        ? new Error(`Nenhuma carta encontrada para ${setCode.toUpperCase()} #${collectorNumber}.`)
        : new Error('Não foi possível acessar o banco de dados de cartas. Verifique sua conexão e tente novamente.');
    }

    return mapRow(data as unknown as PrintingRow);
  }

  async searchByName(query: string): Promise<CardLookupResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < NAME_SEARCH_MIN_LENGTH) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('printings')
      .select(
        'scryfall_id, oracle_id, set_code, set_name, collector_number, rarity, image_url, cards!inner(name, type_line, oracle_text, color_identity, commander_legality, card_faces)',
      )
      .ilike('cards.name', `%${trimmed}%`)
      .order('set_code')
      .order('collector_number')
      .limit(NAME_SEARCH_LIMIT);

    if (error) {
      throw new Error('Não foi possível acessar o banco de dados de cartas. Verifique sua conexão e tente novamente.');
    }

    const rows = (data ?? []) as unknown as PrintingRow[];
    const results = rows.map(mapRow);

    // Collapse to one row per distinct card name, keeping the first printing
    // encountered in the (set_code, collector_number)-ordered result set.
    const seen = new Set<string>();
    const deduped: CardLookupResult[] = [];
    for (const result of results) {
      if (seen.has(result.name)) {
        continue;
      }
      seen.add(result.name);
      deduped.push(result);
    }
    return deduped;
  }

  async listPrintings(oracleId: string): Promise<CardLookupResult[]> {
    const { data, error } = await this.supabase
      .from('printings')
      .select(
        'scryfall_id, oracle_id, set_code, set_name, collector_number, rarity, image_url, cards(name, type_line, oracle_text, color_identity, commander_legality, card_faces)',
      )
      .eq('oracle_id', oracleId)
      .order('set_code')
      .order('collector_number');

    if (error) {
      throw new Error('Não foi possível acessar o banco de dados de cartas. Verifique sua conexão e tente novamente.');
    }

    return ((data ?? []) as unknown as PrintingRow[]).map(mapRow);
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
    setCode: row.set_code.toUpperCase(),
    setName: row.set_name ?? '',
    collectorNumber: row.collector_number,
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

import { createClient } from '@supabase/supabase-js';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline';

const SUPABASE_URL = process.env['SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Kept small and paced with a delay between batches out of consideration for
// the free-tier project's limited compute/connection allowance — avoids
// statement timeouts and back-to-back load spikes on shared infrastructure.
const BATCH_SIZE = 250;
const BATCH_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Not real, ownable/deck-buildable cards — irrelevant to a physical collection
// and deck-building app.
const EXCLUDED_LAYOUTS = new Set(['token', 'double_faced_token', 'emblem', 'art_series']);

// Scryfall rejects requests carrying an HTTP library's default User-Agent
// ("generic_user_agent" 400) — every request needs a custom one.
const SCRYFALL_HEADERS = {
  'User-Agent': 'Grimorio/1.0 (personal MTG collection app; card catalog sync script)',
  Accept: '*/*',
};

interface ScryfallImageUris {
  normal?: string;
}

interface ScryfallCardFace {
  name: string;
  power?: string | null;
  colors?: string[];
  mana_cost?: string;
  toughness?: string | null;
  type_line?: string;
  oracle_text?: string;
  image_uris?: ScryfallImageUris;
}

interface ScryfallCard {
  id: string;
  oracle_id?: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  lang: string;
  rarity: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  color_identity: string[];
  power?: string | null;
  toughness?: string | null;
  loyalty?: string | null;
  layout: string;
  legalities: { commander: string };
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  digital: boolean;
  oversized: boolean;
}

interface BulkDataEntry {
  type: string;
  jsonl_download_uri: string;
}

async function fetchDefaultCardsUri(): Promise<string> {
  const res = await fetch('https://api.scryfall.com/bulk-data', { headers: SCRYFALL_HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to list Scryfall bulk-data: ${res.status} ${res.statusText}`);
  }
  const { data } = (await res.json()) as { data: BulkDataEntry[] };
  const defaultCards = data.find((entry) => entry.type === 'default_cards');
  if (!defaultCards) {
    throw new Error('Scryfall bulk-data response did not include a default_cards entry.');
  }
  return defaultCards.jsonl_download_uri;
}

function imageUrlOf(card: Pick<ScryfallCard, 'image_uris' | 'card_faces'>): string | null {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
}

function toCardRow(card: ScryfallCard) {
  return {
    oracle_id: card.oracle_id,
    name: card.name,
    mana_cost: card.mana_cost ?? null,
    mana_value: card.cmc,
    type_line: card.type_line,
    oracle_text: card.oracle_text ?? null,
    color_identity: card.color_identity,
    power: card.power ?? null,
    toughness: card.toughness ?? null,
    loyalty: card.loyalty ?? null,
    layout: card.layout,
    commander_legality: card.legalities.commander,
    image_url: imageUrlOf(card),
    card_faces: card.card_faces
      ? card.card_faces.map((face) => ({
          name: face.name,
          power: face.power ?? null,
          colors: face.colors ?? [],
          image_url: face.image_uris?.normal ?? null,
          mana_cost: face.mana_cost ?? '',
          toughness: face.toughness ?? null,
          type_line: face.type_line ?? '',
          oracle_text: face.oracle_text ?? '',
        }))
      : null,
  };
}

function toPrintingRow(card: ScryfallCard) {
  return {
    scryfall_id: card.id,
    oracle_id: card.oracle_id,
    set_code: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    lang: card.lang,
    rarity: card.rarity,
    image_url: imageUrlOf(card),
  };
}

async function upsertInBatches(
  table: 'cards' | 'printings',
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<void> {
  const total = Math.ceil(rows.length / BATCH_SIZE);
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      throw new Error(`Failed to upsert ${table} batch ${i / BATCH_SIZE + 1}/${total}: ${error.message}`);
    }
    console.log(`${table}: batch ${i / BATCH_SIZE + 1}/${total} (${batch.length} rows)`);

    if (i + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}

async function main(): Promise<void> {
  console.log('Fetching Scryfall bulk-data catalog...');
  const jsonlUri = await fetchDefaultCardsUri();

  console.log('Streaming default_cards dataset (this is a large, gzip-compressed file)...');
  const res = await fetch(jsonlUri, { headers: SCRYFALL_HEADERS });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download default_cards: ${res.status} ${res.statusText}`);
  }

  const cardsByOracleId = new Map<string, ReturnType<typeof toCardRow>>();
  const printingsByKey = new Map<string, ScryfallCard>();
  let duplicatePrintings = 0;

  const gunzipped = Readable.fromWeb(res.body as never).pipe(createGunzip());
  const lines = createInterface({ input: gunzipped, crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    const card = JSON.parse(line) as ScryfallCard;
    if (!card.oracle_id || card.digital || EXCLUDED_LAYOUTS.has(card.layout)) {
      continue;
    }
    if (!cardsByOracleId.has(card.oracle_id)) {
      cardsByOracleId.set(card.oracle_id, toCardRow(card));
    }

    const printingKey = `${card.set}|${card.collector_number}|${card.lang}`;
    if (printingsByKey.has(printingKey)) {
      duplicatePrintings++;
    } else {
      printingsByKey.set(printingKey, card);
    }
  }

  const cardRows = [...cardsByOracleId.values()];
  const printingRows = [...printingsByKey.values()].map(toPrintingRow);
  console.log(`Parsed ${cardRows.length} unique cards and ${printingRows.length} printings.`);
  if (duplicatePrintings > 0) {
    console.log(`Skipped ${duplicatePrintings} duplicate (set, collector number, lang) printings.`);
  }

  await upsertInBatches('cards', cardRows, 'oracle_id');
  await upsertInBatches('printings', printingRows, 'scryfall_id');

  console.log('Sync complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  PlanarCardData,
  PlanarCardRecord,
  PlanarTranslations,
} from '../src/app/core/data/planechase/planar-card.model';

const SUPABASE_URL = process.env['SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DATA_DIR = 'src/app/core/data/planechase';
const CARDS_PATH = resolve(DATA_DIR, 'cards.json');
const TRANSLATIONS_PATH = resolve(DATA_DIR, 'cards.pt-br.json');

// Supabase caps a select at 1000 rows by default.
const PAGE_SIZE = 1000;

// Planes whose chaos ability the pattern below gets wrong, keyed by oracle_id:
// the paragraph index to use, or null for a plane that genuinely has none.
const ABILITY_OVERRIDES: Record<string, number | null> = {};

const CHAOS_PATTERN = /\bchaos ensue[sd]?\b|\bchaos ensures\b|^chaos:/i;

interface CatalogCard {
  oracle_id: string;
  name: string;
  type_line: string;
  oracle_text: string | null;
}

interface CatalogPrinting {
  oracle_id: string;
  set_code: string;
  set_name: string;
  collector_number: string;
  border_color: string | null;
  released_at: string | null;
  image_small: string | null;
  image_large: string | null;
}

class MissingColumnsError extends Error {}

async function fetchAll<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Failed to read ${label}: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) {
      return rows;
    }
  }
}

async function readCatalog(): Promise<{ cards: CatalogCard[]; printings: CatalogPrinting[] }> {
  const cards = await fetchAll<CatalogCard>(
    (from, to) =>
      supabase
        .from('cards')
        .select('oracle_id, name, type_line, oracle_text')
        .eq('layout', 'planar')
        .order('oracle_id')
        .range(from, to),
    'cards',
  );
  const ids = cards.map((card) => card.oracle_id);
  const printings = await fetchAll<CatalogPrinting>(
    (from, to) =>
      supabase
        .from('printings')
        .select(
          'oracle_id, set_code, set_name, collector_number, border_color, released_at, image_small, image_large',
        )
        .in('oracle_id', ids)
        .eq('lang', 'en')
        // A plain neq would drop null borders (null <> 'gold' is null), hiding a
        // catalog that sync:scryfall hasn't filled in yet from the check below.
        .or('border_color.is.null,border_color.neq.gold')
        .order('scryfall_id')
        .range(from, to),
    'printings',
  );
  return { cards, printings };
}

function comparePrintings(a: CatalogPrinting, b: CatalogPrinting): number {
  return (
    (b.released_at ?? '').localeCompare(a.released_at ?? '') ||
    a.set_code.localeCompare(b.set_code) ||
    a.collector_number.localeCompare(b.collector_number, 'en', { numeric: true })
  );
}

function newestPrintings(printings: CatalogPrinting[]): Map<string, CatalogPrinting> {
  const incomplete = printings.filter(
    (p) => !p.border_color || !p.released_at || !p.image_small || !p.image_large,
  );
  if (incomplete.length > 0) {
    throw new MissingColumnsError(
      'Catalog is missing border/release/image columns — run `npm run sync:scryfall` first.',
    );
  }
  const newest = new Map<string, CatalogPrinting>();
  for (const printing of printings) {
    const current = newest.get(printing.oracle_id);
    if (!current || comparePrintings(printing, current) < 0) {
      newest.set(printing.oracle_id, printing);
    }
  }
  return newest;
}

function splitAbility(
  card: CatalogCard,
  kind: PlanarCardRecord['kind'],
): { text: string; ability: string | null } {
  const oracleText = card.oracle_text ?? '';
  if (kind === 'phenomenon') {
    return { text: '', ability: oracleText };
  }
  const paragraphs = oracleText.split('\n');
  let index: number | null;
  if (card.oracle_id in ABILITY_OVERRIDES) {
    index = ABILITY_OVERRIDES[card.oracle_id];
  } else {
    const matches = paragraphs
      .map((p, i) => (CHAOS_PATTERN.test(p) ? i : -1))
      .filter((i) => i >= 0);
    index = matches.length > 0 ? matches[matches.length - 1] : null;
  }
  if (index === null) {
    return { text: paragraphs.join('\n'), ability: null };
  }
  return {
    text: paragraphs.filter((_, i) => i !== index).join('\n'),
    ability: paragraphs[index],
  };
}

function hashOf(typeLine: string, text: string, ability: string | null): string {
  return createHash('sha256')
    .update(JSON.stringify([typeLine, text, ability]))
    .digest('hex')
    .slice(0, 16);
}

function toRecord(card: CatalogCard, printing: CatalogPrinting): PlanarCardRecord {
  const kind: PlanarCardRecord['kind'] = card.type_line.startsWith('Phenomenon')
    ? 'phenomenon'
    : 'plane';
  const { text, ability } = splitAbility(card, kind);
  return {
    id: card.oracle_id,
    name: card.name,
    kind,
    typeLine: card.type_line,
    text,
    ability,
    set: { code: printing.set_code, name: printing.set_name, releasedAt: printing.released_at! },
    images: { small: printing.image_small!, large: printing.image_large! },
    hash: hashOf(card.type_line, text, ability),
  };
}

function compareRecords(a: PlanarCardRecord, b: PlanarCardRecord): number {
  return (
    b.set.releasedAt.localeCompare(a.set.releasedAt) ||
    a.set.code.localeCompare(b.set.code) ||
    a.name.localeCompare(b.name, 'en')
  );
}

function validate(records: PlanarCardRecord[]): void {
  const names = new Set<string>();
  for (const record of records) {
    if (names.has(record.name)) {
      throw new Error(`Duplicate card name in the catalog: ${record.name}`);
    }
    names.add(record.name);
    const required = [
      record.id,
      record.name,
      record.typeLine,
      record.set.code,
      record.set.name,
      record.set.releasedAt,
      record.images.small,
      record.images.large,
    ];
    if (required.some((value) => !value)) {
      throw new Error(`Card ${record.name} (${record.id}) has an empty field.`);
    }
    if (record.kind === 'phenomenon' && !record.ability) {
      throw new Error(`Phenomenon ${record.name} (${record.id}) has no encounter text.`);
    }
  }
}

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

function listLine(label: string, names: string[], suffix = ''): string {
  return names.length > 0
    ? `${label} (${names.length}): ${names.join(', ')}${suffix}`
    : `${label} (0)`;
}

async function main(): Promise<void> {
  const { cards, printings } = await readCatalog();
  const newest = newestPrintings(printings);

  const records = cards
    .filter((card) => newest.has(card.oracle_id))
    .map((card) => toRecord(card, newest.get(card.oracle_id)!))
    .sort(compareRecords);
  validate(records);

  const previous = readJson<PlanarCardData>(CARDS_PATH, { cards: [] });
  const translations = readJson<PlanarTranslations>(TRANSLATIONS_PATH, {});

  const data: PlanarCardData = { cards: records };
  writeFileSync(CARDS_PATH, JSON.stringify(data, null, 2) + '\n');

  const previousById = new Map(previous.cards.map((card) => [card.id, card]));
  const currentIds = new Set(records.map((card) => card.id));
  const added = records.filter((card) => !previousById.has(card.id)).map((card) => card.name);
  const changed = records
    .filter((card) => {
      const before = previousById.get(card.id);
      return before !== undefined && JSON.stringify(before) !== JSON.stringify(card);
    })
    .map((card) => card.name);
  const removed = previous.cards
    .filter((card) => !currentIds.has(card.id))
    .map((card) => card.name);
  const noChaos = records
    .filter((card) => card.kind === 'plane' && card.ability === null)
    .map((card) => card.name);
  const untranslated = records
    .filter((card) => translations[card.id]?.sourceHash !== card.hash)
    .map((card) => card.name);

  const planes = records.filter((card) => card.kind === 'plane').length;
  console.log(
    `Wrote ${records.length} cards (${planes} planes, ${records.length - planes} phenomena) to ${DATA_DIR}/cards.json.`,
  );
  console.log(listLine('New', added));
  console.log(listLine('Changed', changed));
  console.log(listLine('Removed', removed));
  if (noChaos.length > 0) {
    console.log(
      listLine(
        'Planes with no chaos ability',
        noChaos,
        ' — confirm or add an ABILITY_OVERRIDES entry.',
      ),
    );
  }
  if (untranslated.length > 0) {
    console.log(listLine('Missing or outdated translations', untranslated));
    console.log('Run in Claude Code: /planechase-translate');
  } else {
    console.log('Translations are up to date.');
  }
}

main().catch((err) => {
  console.error(err instanceof MissingColumnsError ? err.message : err);
  process.exit(1);
});

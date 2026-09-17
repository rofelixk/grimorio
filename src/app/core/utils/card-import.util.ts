import { CardCondition, CardFinish } from '@models/card.model';

export type ImportSource = 'archidekt' | 'ligamagic';

export interface ImportRow {
  source: ImportSource;
  name: string;
  setCode: string;
  collectorNumber: string;
  scryfallId?: string;
  finish: CardFinish;
  language: string;
  condition: CardCondition;
  quantity: number;
  raw: Record<string, string>;
}

// LigaMagic's own set-code abbreviations occasionally diverge from Scryfall's
// (e.g. Urza's Destiny is "ud" there but "uds" on Scryfall) — extend as more
// mismatches are discovered.
export const LIGAMAGIC_SET_ALIASES: Record<string, string> = {
  ud: 'uds',
};

const LIGAMAGIC_CONDITION_MAP: Record<string, CardCondition> = {
  M: 'NM',
  NM: 'NM',
  SP: 'LP',
  MP: 'MP',
  HP: 'HP',
  D: 'DMG',
};

// LigaMagic's Idioma codes don't line up with the app's own language codes
// (see LANGUAGES in card-add-detail-panel.ts) — BR maps to our 'pt', ES to
// our 'sp', KO to our 'kr', and TW (Traditional Chinese) has no exact match
// so it falls back to 'cs' (the only Chinese entry, Simplified).
const LIGAMAGIC_LANGUAGE_MAP: Record<string, string> = {
  BR: 'pt',
  EN: 'en',
  DE: 'de',
  ES: 'sp',
  FR: 'fr',
  IT: 'it',
  JP: 'jp',
  KO: 'kr',
  RU: 'ru',
  TW: 'cs',
};

export function detectImportSource(headers: string[]): ImportSource | null {
  if (headers.includes('Scryfall ID')) {
    return 'archidekt';
  }
  if (headers.includes('Edicao (Sigla)')) {
    return 'ligamagic';
  }
  return null;
}

export function mapArchidektFinish(value: string): CardFinish {
  switch (value.trim().toLowerCase()) {
    case 'foil':
      return 'foil';
    case 'etched':
      return 'etched';
    default:
      return 'nonfoil';
  }
}

export function mapArchidektCondition(value: string): CardCondition {
  const trimmed = value.trim().toUpperCase();
  return (['NM', 'LP', 'MP', 'HP', 'DMG'] as CardCondition[]).includes(trimmed as CardCondition)
    ? (trimmed as CardCondition)
    : 'NM';
}

export function parseArchidektRow(row: Record<string, string>): ImportRow {
  return {
    source: 'archidekt',
    name: row['Name']?.trim() ?? '',
    setCode: row['Edition Code']?.trim().toLowerCase() ?? '',
    collectorNumber: row['Collector Number']?.trim() ?? '',
    scryfallId: row['Scryfall ID']?.trim() || undefined,
    finish: mapArchidektFinish(row['Finish'] ?? ''),
    condition: mapArchidektCondition(row['Condition'] ?? ''),
    language: row['Language']?.trim().toLowerCase() || 'en',
    quantity: Number(row['Quantity']) || 1,
    raw: row,
  };
}

// LigaMagic's free-text Extras column carries the finish — substring match
// rather than an exact map, since it combines multiple tags (e.g. "Foil
// Especial / Foil Etched").
export function mapLigaMagicExtras(value: string): CardFinish {
  const lower = value.toLowerCase();
  if (lower.includes('etched')) {
    return 'etched';
  }
  if (lower.includes('foil')) {
    return 'foil';
  }
  return 'nonfoil';
}

export function mapLigaMagicCondition(value: string): CardCondition {
  return LIGAMAGIC_CONDITION_MAP[value.trim().toUpperCase()] ?? 'NM';
}

export function mapLigaMagicLanguage(value: string): string {
  return LIGAMAGIC_LANGUAGE_MAP[value.trim().toUpperCase()] ?? 'en';
}

export function parseLigaMagicRow(row: Record<string, string>): ImportRow {
  const nameEn = row['Card (EN)']?.trim();
  const namePt = row['Card (PT)']?.trim();
  return {
    source: 'ligamagic',
    name: nameEn || namePt || '',
    setCode: row['Edicao (Sigla)']?.trim().toLowerCase() ?? '',
    collectorNumber: row['Card #']?.trim() ?? '',
    finish: mapLigaMagicExtras(row['Extras'] ?? ''),
    condition: mapLigaMagicCondition(row['Qualidade (M NM SP MP HP D)'] ?? ''),
    language: mapLigaMagicLanguage(row['Idioma (BR EN DE ES FR IT JP KO RU TW)'] ?? ''),
    quantity: Number(row['Quantidade']) || 1,
    raw: row,
  };
}

// Both exports arrive mis-decoded as UTF-8 when they're actually Windows-1252
// (visible as mojibake, e.g. "Mans�o" for "Mansão") — detect the replacement
// character and redecode from the raw bytes.
// Identifies "the same physical card entry" for import merging: same
// printing, finish, language and condition — matches CardEntry fields the
// user could otherwise end up with duplicate rows for.
export function cardPrintingKey(card: {
  scryfallId: string;
  finish: CardFinish;
  language: string;
  condition: CardCondition;
}): string {
  return `${card.scryfallId}|${card.finish}|${card.language}|${card.condition}`;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function groupBy<T, K>(items: T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}

export function decodeCsvBytes(bytes: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  if (utf8.includes('�')) {
    return new TextDecoder('windows-1252').decode(bytes);
  }
  return utf8;
}

import { Injectable } from '@angular/core';
import type { Color, CommanderLegality } from '@models/card.model';
import {
  CatalogError,
  type CatalogCard,
  type CatalogCardDetail,
  type CatalogPrinting,
  type SearchPage,
} from '@models/catalog.model';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { sortPrintings } from '@utils/card-entry.util';
import { PAGE_SIZE, escapeLike, searchKey } from '@utils/card-search.util';
import { isNetworkError } from '@utils/cloud-error.util';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../supabase-client';

interface CardRow {
  oracle_id: string;
  name: string;
  type_line: string;
  color_identity: string[];
  image_url: string | null;
}

interface PrintingRow {
  scryfall_id: string;
  set_code: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  lang: string;
  released_at: string | null;
  image_url: string | null;
  image_small: string | null;
  artist: string | null;
  faces: { name: string; image_url: string | null }[] | null;
}

interface DetailRow extends CardRow {
  oracle_text: string | null;
  commander_legality: string;
  card_faces: { oracle_text?: string | null }[] | null;
  printings: PrintingRow[];
}

const SEARCH_COLUMNS = 'oracle_id, name, type_line, color_identity, image_url';
const DETAIL_COLUMNS =
  'oracle_id, name, type_line, oracle_text, color_identity, commander_legality, card_faces, image_url, ' +
  'printings(scryfall_id, set_code, set_name, collector_number, rarity, lang, released_at, image_url, image_small, artist, faces)';

function toCard(row: CardRow): CatalogCard {
  return {
    oracleId: row.oracle_id,
    name: row.name,
    typeLine: row.type_line,
    colorIdentity: row.color_identity as Color[],
    imageUrl: row.image_url,
  };
}

function toPrinting(row: PrintingRow): CatalogPrinting {
  return {
    scryfallId: row.scryfall_id,
    setCode: row.set_code.toUpperCase(),
    setName: row.set_name,
    collectorNumber: row.collector_number,
    rarity: row.rarity,
    lang: row.lang,
    releasedAt: row.released_at,
    imageUrl: row.image_url,
    imageSmall: row.image_small,
    artist: row.artist,
    faces: row.faces?.map((face) => ({ name: face.name, imageUrl: face.image_url ?? '' })) ?? null,
  };
}

function toError(error: unknown): CatalogError {
  const offline = (typeof navigator !== 'undefined' && navigator.onLine === false) || isNetworkError(error);
  return new CatalogError(offline ? 'offline' : 'failed');
}

// The card catalog (spec 015, R1, R2, R4, R6): public read-only `cards` and `printings`, reached
// with one anonymous client created on the first call, so a local-only profile can search. A failure
// becomes a `CatalogError` of kind `offline` or `failed`; the service's own error text never reaches the UI.
@Injectable({ providedIn: 'root' })
export class CardCatalogService {
  private client: SupabaseClient | null = null;

  /** One page of cards whose name contains the text (accents and case ignored), alphabetical. */
  async search(text: string, page: number): Promise<SearchPage> {
    try {
      const from = page * PAGE_SIZE;
      const { data, error } = await this.db()
        .from('cards')
        .select(SEARCH_COLUMNS)
        .ilike('search_name', `%${escapeLike(searchKey(text))}%`)
        .order('name')
        .order('oracle_id')
        .range(from, from + PAGE_SIZE);
      if (error) {
        throw error;
      }
      const rows = data as CardRow[];
      return { cards: rows.slice(0, PAGE_SIZE).map(toCard), hasMore: rows.length > PAGE_SIZE };
    } catch (error) {
      throw toError(error);
    }
  }

  /** One card with its card-level fields and every printing, sorted for the printing list. */
  async detail(oracleId: string): Promise<CatalogCardDetail> {
    try {
      const { data, error } = await this.db().from('cards').select(DETAIL_COLUMNS).eq('oracle_id', oracleId).single();
      if (error) {
        throw error;
      }
      const row = data as unknown as DetailRow;
      return {
        ...toCard(row),
        oracleText: row.oracle_text,
        commanderLegality: row.commander_legality as CommanderLegality,
        cardFaces: row.card_faces?.map((face) => ({ oracleText: face.oracle_text ?? '' })) ?? null,
        printings: sortPrintings(row.printings.map(toPrinting)),
      };
    } catch (error) {
      throw toError(error);
    }
  }

  /** The anonymous catalog client; specs override this with a fake. */
  protected createCatalogClient(): SupabaseClient {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'grm-catalog',
      },
    });
  }

  private db(): SupabaseClient {
    return (this.client ??= this.createCatalogClient());
  }
}

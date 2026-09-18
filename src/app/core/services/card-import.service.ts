import { Injectable, inject } from '@angular/core';
import Papa from 'papaparse';
import { CardEntry } from '@models/card.model';
import {
  cardPrintingKey,
  chunk,
  decodeCsvBytes,
  detectImportSource,
  groupBy,
  ImportRow,
  LIGAMAGIC_SET_ALIASES,
  parseArchidektRow,
  parseLigaMagicRow,
} from '../utils/card-import.util';
import { CardService } from './card.service';
import { CardLookupResult, CardLookupService, normalizeCollectorNumber } from './card-lookup.service';

export interface MatchedRow {
  row: ImportRow;
  card: CardLookupResult;
}

export interface UnresolvedRow {
  row: ImportRow;
  reason: 'unmatched' | 'ambiguous';
}

// searchByName() fallback only runs for the small residual that scryfallId/
// set-code batching couldn't resolve, so a per-row bounded-concurrency loop
// is fine there — it's the bulk path (one query per row) this whole service
// is built to avoid.
const NAME_FALLBACK_CONCURRENCY = 10;
const SCRYFALL_ID_BATCH_SIZE = 200;

@Injectable({ providedIn: 'root' })
export class CardImportService {
  private readonly cardLookup = inject(CardLookupService);
  private readonly cardService = inject(CardService);

  async parse(file: File): Promise<ImportRow[]> {
    const bytes = await file.arrayBuffer();
    const text = decodeCsvBytes(bytes);

    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const headers = result.meta.fields ?? [];
    const source = detectImportSource(headers);
    if (!source) {
      throw new Error('Formato de CSV não reconhecido. Exporte da Archidekt ou LigaMagic.');
    }

    const parseRow = source === 'archidekt' ? parseArchidektRow : parseLigaMagicRow;
    return result.data.map(parseRow);
  }

  // Batches every step instead of querying per row: one (chunked) query for
  // all Scryfall IDs, one query per distinct set code for the rest, a second
  // pass through LIGAMAGIC_SET_ALIASES for whatever's still unmatched, and
  // only the small remainder falls back to a per-row name search.
  async match(rows: ImportRow[]): Promise<{ matched: MatchedRow[]; unresolved: UnresolvedRow[] }> {
    const matched: MatchedRow[] = [];
    const unresolved: UnresolvedRow[] = [];

    const byScryfallId = rows.filter((row): row is ImportRow & { scryfallId: string } =>
      Boolean(row.scryfallId),
    );
    const withoutScryfallId: ImportRow[] = [];

    if (byScryfallId.length > 0) {
      const scryfallMap = new Map<string, CardLookupResult>();
      for (const idsBatch of chunk(byScryfallId.map((row) => row.scryfallId), SCRYFALL_ID_BATCH_SIZE)) {
        const found = await this.cardLookup.lookupManyByScryfallIds(idsBatch);
        for (const [id, card] of found) {
          scryfallMap.set(id, card);
        }
      }
      for (const row of byScryfallId) {
        const card = scryfallMap.get(row.scryfallId);
        if (card) {
          matched.push({ row, card });
        } else {
          unresolved.push({ row, reason: 'unmatched' });
        }
      }
    }

    for (const row of rows) {
      if (!row.scryfallId) {
        withoutScryfallId.push(row);
      }
    }

    const withSetAndCollector = withoutScryfallId.filter((row) => row.setCode && row.collectorNumber);
    const withoutSetAndCollector = withoutScryfallId.filter(
      (row) => !row.setCode || !row.collectorNumber,
    );

    const stillUnresolved = await this.matchBySetCode(withSetAndCollector, matched, (setCode) => setCode);

    // Retry whatever's left through the LigaMagic set-code alias table
    // (e.g. "ud" → "uds"), still batched by the aliased set code.
    const aliasable = stillUnresolved.filter((row) => LIGAMAGIC_SET_ALIASES[row.setCode.toLowerCase()]);
    const notAliasable = stillUnresolved.filter((row) => !LIGAMAGIC_SET_ALIASES[row.setCode.toLowerCase()]);
    const stillUnresolvedAfterAlias = await this.matchBySetCode(
      aliasable,
      matched,
      (setCode) => LIGAMAGIC_SET_ALIASES[setCode.toLowerCase()],
    );

    const nameFallbackRows = [...withoutSetAndCollector, ...notAliasable, ...stillUnresolvedAfterAlias];
    for (let i = 0; i < nameFallbackRows.length; i += NAME_FALLBACK_CONCURRENCY) {
      const batch = nameFallbackRows.slice(i, i + NAME_FALLBACK_CONCURRENCY);
      const results = await Promise.all(batch.map((row) => this.matchByName(row)));
      for (const result of results) {
        if (result.card) {
          matched.push({ row: result.row, card: result.card });
        } else {
          unresolved.push({ row: result.row, reason: result.reason! });
        }
      }
    }

    return { matched, unresolved };
  }

  // Groups rows by (possibly remapped) set code and issues one query per
  // group; returns the rows that still had no match.
  private async matchBySetCode(
    rows: ImportRow[],
    matched: MatchedRow[],
    resolveSetCode: (setCode: string) => string,
  ): Promise<ImportRow[]> {
    const unresolved: ImportRow[] = [];
    const groups = groupBy(rows, (row) => resolveSetCode(row.setCode).toLowerCase());

    for (const [setCode, group] of groups) {
      const printings = await this.cardLookup.lookupManyBySetCode(
        setCode,
        group.map((row) => row.collectorNumber),
      );
      const byCollectorNumber = new Map(
        printings.map((printing) => [normalizeCollectorNumber(printing.collectorNumber), printing]),
      );
      for (const row of group) {
        const card = byCollectorNumber.get(normalizeCollectorNumber(row.collectorNumber));
        if (card) {
          matched.push({ row, card });
        } else {
          unresolved.push(row);
        }
      }
    }

    return unresolved;
  }

  private async matchByName(
    row: ImportRow,
  ): Promise<{ row: ImportRow; card: CardLookupResult | null; reason?: 'unmatched' | 'ambiguous' }> {
    if (!row.name) {
      return { row, card: null, reason: 'unmatched' };
    }

    const candidates = await this.cardLookup.searchByName(row.name);
    if (candidates.length === 0) {
      return { row, card: null, reason: 'unmatched' };
    }
    if (candidates.length > 1) {
      return { row, card: null, reason: 'ambiguous' };
    }

    const [candidate] = candidates;
    if (!row.setCode && !row.collectorNumber) {
      return { row, card: candidate };
    }

    const printings = await this.cardLookup.listPrintings(candidate.oracleId);
    const printingMatch = printings.find(
      (printing) =>
        printing.setCode.toLowerCase() === row.setCode.toLowerCase() &&
        printing.collectorNumber === row.collectorNumber,
    );
    return printingMatch ? { row, card: printingMatch } : { row, card: null, reason: 'ambiguous' };
  }

  // Rows matching a printing/finish/language/condition already held at this
  // location bump that entry's quantity instead of creating a duplicate
  // CardEntry; only genuinely new printings get inserted.
  import(matched: MatchedRow[], locationId: string): { added: CardEntry[]; updated: CardEntry[] } {
    const existingByKey = new Map<string, CardEntry>();
    for (const card of this.cardService.cards()) {
      if (card.locationId === locationId) {
        existingByKey.set(cardPrintingKey(card), card);
      }
    }

    const toAdd: Omit<CardEntry, 'id' | 'updatedAt'>[] = [];
    const updated: CardEntry[] = [];

    for (const { row, card } of matched) {
      const key = cardPrintingKey({
        scryfallId: card.scryfallId,
        finish: row.finish,
        language: row.language,
        condition: row.condition,
      });
      const existing = existingByKey.get(key);
      if (existing) {
        const nextEntry = { ...existing, quantity: existing.quantity + row.quantity };
        this.cardService.update(existing.id, { quantity: nextEntry.quantity });
        existingByKey.set(key, nextEntry);
        updated.push(nextEntry);
      } else {
        toAdd.push({
          ...card,
          finish: row.finish,
          language: row.language,
          condition: row.condition,
          quantity: row.quantity,
          locationId,
          forSale: false,
        });
      }
    }

    const added = this.cardService.addMany(toAdd);
    return { added, updated };
  }
}

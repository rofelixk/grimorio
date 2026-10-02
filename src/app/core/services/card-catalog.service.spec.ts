import { TestBed } from '@angular/core/testing';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogError } from '@models/catalog.model';
import { CardCatalogService } from './card-catalog.service';

type Answer = { data: unknown; error: unknown } | Error;

/** A chainable stand-in for the PostgREST builder: every method returns it, awaiting it answers. */
function fakeClient(answer: () => Answer) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['from', 'select', 'ilike', 'order', 'range', 'eq', 'single']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder['then'] = (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => {
    const result = answer();
    return result instanceof Error ? reject(result) : resolve(result);
  };
  return { client: builder as unknown as SupabaseClient, calls };
}

function setUp(answer: () => Answer) {
  const fake = fakeClient(answer);
  let created = 0;
  class TestCatalog extends CardCatalogService {
    protected override createCatalogClient(): SupabaseClient {
      created += 1;
      return fake.client;
    }
  }
  TestBed.configureTestingModule({ providers: [{ provide: CardCatalogService, useClass: TestCatalog }] });
  return { service: TestBed.inject(CardCatalogService), calls: fake.calls, created: () => created };
}

const cardRow = (n: number) => ({
  oracle_id: `o${n}`,
  name: `Card ${n}`,
  type_line: 'Artifact',
  color_identity: ['R'],
  image_url: n === 0 ? null : `https://img/${n}.jpg`,
});

describe('CardCatalogService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  describe('search', () => {
    it('queries the accent-free key escaped, ordered, with a 101-row probe', async () => {
      const { service, calls } = setUp(() => ({ data: [], error: null }));
      await service.search('100%_Jötun', 2);

      expect(calls.find((c) => c.method === 'ilike')!.args).toEqual(['search_name', '%100\\%\\_jotun%']);
      expect(calls.find((c) => c.method === 'range')!.args).toEqual([200, 300]);
      expect(calls.filter((c) => c.method === 'order').map((c) => c.args[0])).toEqual(['name', 'oracle_id']);
    });

    it('returns 100 cards without hasMore for exactly 100 rows', async () => {
      const { service } = setUp(() => ({ data: Array.from({ length: 100 }, (_, i) => cardRow(i)), error: null }));
      const page = await service.search('sol', 0);
      expect(page.cards).toHaveLength(100);
      expect(page.hasMore).toBe(false);
    });

    it('returns 100 cards with hasMore for 101 rows', async () => {
      const { service } = setUp(() => ({ data: Array.from({ length: 101 }, (_, i) => cardRow(i)), error: null }));
      const page = await service.search('sol', 0);
      expect(page.cards).toHaveLength(100);
      expect(page.hasMore).toBe(true);
    });

    it('maps a row to a catalog card, keeping a null image', async () => {
      const { service } = setUp(() => ({ data: [cardRow(0)], error: null }));
      expect((await service.search('sol', 0)).cards[0]).toEqual({
        oracleId: 'o0',
        name: 'Card 0',
        typeLine: 'Artifact',
        colorIdentity: ['R'],
        imageUrl: null,
      });
    });

    it('creates the anonymous client once', async () => {
      const { service, created } = setUp(() => ({ data: [], error: null }));
      await service.search('sol', 0);
      await service.search('sol', 1);
      expect(created()).toBe(1);
    });

    it('fails with kind "failed" for a PostgREST error, hiding its text', async () => {
      const { service } = setUp(() => ({ data: null, error: { code: '500', message: 'boom secret' } }));
      const error = await service.search('sol', 0).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(CatalogError);
      expect((error as CatalogError).kind).toBe('failed');
      expect((error as CatalogError).message).not.toContain('secret');
    });

    it('fails with kind "offline" when the browser is offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      const { service } = setUp(() => ({ data: null, error: { code: '500', message: 'x' } }));
      expect(((await service.search('sol', 0).catch((e: unknown) => e)) as CatalogError).kind).toBe('offline');
    });

    it('fails with kind "offline" when fetch itself rejects', async () => {
      const { service } = setUp(() => new TypeError('Failed to fetch'));
      expect(((await service.search('sol', 0).catch((e: unknown) => e)) as CatalogError).kind).toBe('offline');
    });
  });

  describe('detail', () => {
    const detailRow = {
      ...cardRow(1),
      oracle_text: 'Tap: add two mana.',
      commander_legality: 'legal',
      card_faces: [{ oracle_text: 'Front' }, { oracle_text: null }],
      printings: [
        {
          scryfall_id: 'p-old',
          set_code: 'lea',
          set_name: 'Alpha',
          collector_number: '10',
          rarity: 'rare',
          lang: 'en',
          released_at: '1993-08-05',
          image_url: null,
          image_small: null,
          artist: null,
          faces: null,
        },
        {
          scryfall_id: 'p-new',
          set_code: 'cmr',
          set_name: 'Commander Legends',
          collector_number: '2',
          rarity: 'uncommon',
          lang: 'en',
          released_at: '2020-11-20',
          image_url: 'https://img/front.jpg',
          image_small: 'https://img/small.jpg',
          artist: 'Someone',
          faces: [
            { name: 'Front', image_url: 'https://img/f.jpg' },
            { name: 'Back', image_url: null },
          ],
        },
      ],
    };

    it('maps the card and its printings, newest first, set code uppercased', async () => {
      const { service, calls } = setUp(() => ({ data: detailRow, error: null }));
      const detail = await service.detail('o1');

      expect(calls.find((c) => c.method === 'eq')!.args).toEqual(['oracle_id', 'o1']);
      expect(detail).toMatchObject({
        oracleId: 'o1',
        oracleText: 'Tap: add two mana.',
        commanderLegality: 'legal',
        cardFaces: [{ oracleText: 'Front' }, { oracleText: '' }],
      });
      expect(detail.printings.map((p) => p.scryfallId)).toEqual(['p-new', 'p-old']);
      expect(detail.printings[0]).toMatchObject({
        setCode: 'CMR',
        artist: 'Someone',
        faces: [
          { name: 'Front', imageUrl: 'https://img/f.jpg' },
          { name: 'Back', imageUrl: '' },
        ],
      });
      expect(detail.printings[1].faces).toBeNull();
    });

    it('fails with a CatalogError on an error', async () => {
      const { service } = setUp(() => ({ data: null, error: { message: 'no rows' } }));
      expect(await service.detail('o1').catch((e: unknown) => e)).toBeInstanceOf(CatalogError);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPABASE_CLIENT } from '../supabase-client';
import { CardLookupService } from './card-lookup.service';

describe('CardLookupService', () => {
  let service: CardLookupService;
  let single: ReturnType<typeof vi.fn>;
  let eqSet: ReturnType<typeof vi.fn>;
  let eqCollectorNumber: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    single = vi.fn();
    eqCollectorNumber = vi.fn(() => ({ single }));
    eqSet = vi.fn(() => ({ eq: eqCollectorNumber }));
    const supabaseStub = {
      from: () => ({
        select: () => ({
          eq: eqSet,
        }),
      }),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE_CLIENT, useValue: supabaseStub }],
    });
    service = TestBed.inject(CardLookupService);
  });

  it('maps a single-faced card row to a CardLookupResult', async () => {
    single.mockResolvedValue({
      data: {
        scryfall_id: 'scry-1',
        oracle_id: 'oracle-1',
        set_code: 'mh3',
        set_name: 'Modern Horizons 3',
        collector_number: '161',
        rarity: 'common',
        image_url: 'https://cards.scryfall.io/normal/front/scry-1.jpg',
        cards: {
          name: 'Lightning Bolt',
          type_line: 'Instant',
          oracle_text: 'Lightning Bolt deals 3 damage to any target.',
          color_identity: ['R'],
          commander_legality: 'legal',
          card_faces: null,
        },
      },
      error: null,
    });

    const result = await service.lookup('mh3', '161');

    expect(result).toEqual({
      name: 'Lightning Bolt',
      scryfallId: 'scry-1',
      oracleId: 'oracle-1',
      setCode: 'MH3',
      setName: 'Modern Horizons 3',
      collectorNumber: '161',
      rarity: 'common',
      commanderLegality: 'legal',
      colorIdentity: ['R'],
      typeLine: 'Instant',
      canBeCommander: false,
      imageUrl: 'https://cards.scryfall.io/normal/front/scry-1.jpg',
      faces: undefined,
    });
  });

  it('derives canBeCommander for legendary creatures', async () => {
    single.mockResolvedValue({
      data: {
        scryfall_id: 'scry-2',
        oracle_id: 'oracle-2',
        set_code: 'mid',
        set_name: 'Innistrad: Midnight Hunt',
        collector_number: '278',
        rarity: 'mythic',
        image_url: null,
        cards: {
          name: 'Sorin, Ravenous Neonate',
          type_line: 'Legendary Creature — Vampire',
          oracle_text: null,
          color_identity: ['B'],
          commander_legality: 'legal',
          card_faces: null,
        },
      },
      error: null,
    });

    const result = await service.lookup('mid', '278');

    expect(result.canBeCommander).toBe(true);
    expect(result.imageUrl).toBe('');
  });

  it('maps card_faces for double-faced cards', async () => {
    single.mockResolvedValue({
      data: {
        scryfall_id: 'scry-3',
        oracle_id: 'oracle-3',
        set_code: 'woe',
        set_name: 'Wilds of Eldraine',
        collector_number: '60',
        rarity: 'rare',
        image_url: null,
        cards: {
          name: "Obyra's Attendants // Desperate Parry",
          type_line: 'Creature — Faerie Wizard',
          oracle_text: null,
          color_identity: ['U'],
          commander_legality: 'legal',
          card_faces: [
            { name: "Obyra's Attendants", image_url: 'https://cards.scryfall.io/front.jpg' },
            { name: 'Desperate Parry', image_url: 'https://cards.scryfall.io/back.jpg' },
          ],
        },
      },
      error: null,
    });

    const result = await service.lookup('woe', '60');

    expect(result.faces).toEqual([
      { name: "Obyra's Attendants", imageUrl: 'https://cards.scryfall.io/front.jpg' },
      { name: 'Desperate Parry', imageUrl: 'https://cards.scryfall.io/back.jpg' },
    ]);
    expect(result.imageUrl).toBe('https://cards.scryfall.io/front.jpg');
  });

  it('throws a not-found error when no printing matches', async () => {
    single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } });

    await expect(service.lookup('mid', '9999')).rejects.toThrow('Nenhuma carta encontrada para MID #9999.');
  });

  it('throws a generic error on other failures', async () => {
    single.mockResolvedValue({ data: null, error: { code: '500', message: 'network down' } });

    await expect(service.lookup('mid', '278')).rejects.toThrow(
      'Não foi possível acessar o banco de dados de cartas. Verifique sua conexão e tente novamente.',
    );
  });

  it('strips leading zeros from a zero-padded collector number before querying', async () => {
    single.mockResolvedValue({
      data: {
        scryfall_id: 'scry-4',
        oracle_id: 'oracle-4',
        set_code: 'ecc',
        set_name: 'Lorwyn Eclipsed Commander',
        collector_number: '1',
        rarity: 'mythic',
        image_url: null,
        cards: {
          name: 'Ashling, the Limitless',
          type_line: 'Legendary Creature — Elemental Sorcerer',
          oracle_text: null,
          color_identity: ['B', 'G', 'R', 'U', 'W'],
          commander_legality: 'legal',
          card_faces: null,
        },
      },
      error: null,
    });

    const result = await service.lookup('ecc', '0001');

    expect(eqCollectorNumber).toHaveBeenCalledWith('collector_number', '1');
    expect(result.name).toBe('Ashling, the Limitless');
  });

  it('preserves a non-numeric-suffixed collector number as-is', async () => {
    single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } });

    await expect(service.lookup('mid', '007a')).rejects.toThrow();

    expect(eqCollectorNumber).toHaveBeenCalledWith('collector_number', '7a');
  });
});

describe('CardLookupService.searchByName', () => {
  let service: CardLookupService;
  let ilike: ReturnType<typeof vi.fn>;
  let orderFirst: ReturnType<typeof vi.fn>;
  let orderSecond: ReturnType<typeof vi.fn>;
  let limit: ReturnType<typeof vi.fn>;

  function row(overrides: {
    name: string;
    scryfall_id: string;
    set_code: string;
    collector_number: string;
  }) {
    return {
      scryfall_id: overrides.scryfall_id,
      oracle_id: `oracle-${overrides.scryfall_id}`,
      set_code: overrides.set_code,
      set_name: 'Some Set',
      collector_number: overrides.collector_number,
      rarity: 'common',
      image_url: null,
      cards: {
        name: overrides.name,
        type_line: 'Instant',
        oracle_text: null,
        color_identity: [],
        commander_legality: 'legal',
        card_faces: null,
      },
    };
  }

  beforeEach(() => {
    limit = vi.fn();
    orderSecond = vi.fn(() => ({ limit }));
    orderFirst = vi.fn(() => ({ order: orderSecond }));
    ilike = vi.fn(() => ({ order: orderFirst }));
    const supabaseStub = {
      from: () => ({
        select: () => ({
          ilike,
        }),
      }),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE_CLIENT, useValue: supabaseStub }],
    });
    service = TestBed.inject(CardLookupService);
  });

  it('returns an empty array without querying when the query is under 3 characters', async () => {
    const result = await service.searchByName('so');

    expect(result).toEqual([]);
    expect(ilike).not.toHaveBeenCalled();
  });

  it('queries by name with an ilike filter, ordered and limited', async () => {
    limit.mockResolvedValue({ data: [], error: null });

    await service.searchByName('sol ring');

    expect(ilike).toHaveBeenCalledWith('cards.name', '%sol ring%');
    expect(orderFirst).toHaveBeenCalledWith('set_code');
    expect(orderSecond).toHaveBeenCalledWith('collector_number');
    expect(limit).toHaveBeenCalledWith(200);
  });

  it('collapses multiple printings of the same name to the first one in the ordered results', async () => {
    limit.mockResolvedValue({
      data: [
        row({ name: 'Sol Ring', scryfall_id: 'scry-early', set_code: 'lea', collector_number: '1' }),
        row({ name: 'Sol Ring', scryfall_id: 'scry-late', set_code: 'mh3', collector_number: '250' }),
      ],
      error: null,
    });

    const result = await service.searchByName('sol ring');

    expect(result).toHaveLength(1);
    expect(result[0].scryfallId).toBe('scry-early');
    expect(result[0].setCode).toBe('LEA');
  });

  it('returns distinct results for distinct names', async () => {
    limit.mockResolvedValue({
      data: [
        row({ name: 'Sol Ring', scryfall_id: 'scry-1', set_code: 'lea', collector_number: '1' }),
        row({ name: 'Solemn Simulacrum', scryfall_id: 'scry-2', set_code: 'mh3', collector_number: '2' }),
      ],
      error: null,
    });

    const result = await service.searchByName('sol');

    expect(result.map((r) => r.name)).toEqual(['Sol Ring', 'Solemn Simulacrum']);
  });

  it('throws a generic error on failure', async () => {
    limit.mockResolvedValue({ data: null, error: { code: '500', message: 'network down' } });

    await expect(service.searchByName('sol ring')).rejects.toThrow(
      'Não foi possível acessar o banco de dados de cartas. Verifique sua conexão e tente novamente.',
    );
  });
});

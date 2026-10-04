import { describe, expect, it } from 'vitest';
import type { CatalogCardDetail, CatalogPrinting } from '@models/catalog.model';
import type { Collection } from '@models/collection.model';
import { mockCardEntry } from '@testing/card.mocks';
import {
  canBeCommander,
  detailsLine,
  entryFromPrinting,
  filterPrintings,
  findMatches,
  initialPrinting,
  matchKey,
  printingIdentity,
  sortPrintings,
  validateQuantity,
} from './card-entry.util';

function printing(overrides: Partial<CatalogPrinting> = {}): CatalogPrinting {
  return {
    scryfallId: 's1',
    setCode: 'lea',
    setName: 'Limited Edition Alpha',
    collectorNumber: '161',
    rarity: 'common',
    lang: 'en',
    releasedAt: '1993-08-05',
    imageUrl: 'https://img/front.jpg',
    imageSmall: null,
    artist: 'Christopher Rush',
    faces: null,
    ...overrides,
  };
}

function detail(overrides: Partial<CatalogCardDetail> = {}): CatalogCardDetail {
  return {
    oracleId: 'o1',
    name: 'Lightning Bolt',
    typeLine: 'Instant',
    colorIdentity: ['R'],
    imageUrl: null,
    oracleText: 'Lightning Bolt deals 3 damage to any target.',
    commanderLegality: 'legal',
    cardFaces: null,
    printings: [],
    ...overrides,
  };
}

describe('canBeCommander', () => {
  it('is true for a legendary creature', () => {
    expect(canBeCommander('Legendary Creature — Elf', null, null)).toBe(true);
  });

  it('is false for a legendary non-creature', () => {
    expect(canBeCommander('Legendary Artifact', 'Tap: add one mana.', null)).toBe(false);
  });

  it('is true when the oracle text says so, in any case', () => {
    expect(canBeCommander('Planeswalker', 'Teferi CAN BE YOUR COMMANDER.', null)).toBe(true);
  });

  it('reads the faces when the card has no oracle text of its own', () => {
    expect(canBeCommander('Legendary Planeswalker', null, [{ oracleText: 'x' }, { oracleText: 'Can be your commander' }])).toBe(true);
    expect(canBeCommander('Instant', null, [{ oracleText: 'Draw a card.' }])).toBe(false);
  });
});

describe('sortPrintings', () => {
  it('sorts newest first, then set code, then collector number numerically', () => {
    const sorted = sortPrintings([
      printing({ scryfallId: 'a', releasedAt: '2020-01-01', setCode: 'zzz', collectorNumber: '10' }),
      printing({ scryfallId: 'b', releasedAt: '2020-01-01', setCode: 'zzz', collectorNumber: '2' }),
      printing({ scryfallId: 'c', releasedAt: '2020-01-01', setCode: 'aaa', collectorNumber: '5' }),
      printing({ scryfallId: 'd', releasedAt: '2023-01-01' }),
      printing({ scryfallId: 'e', releasedAt: null }),
    ]);
    expect(sorted.map((p) => p.scryfallId)).toEqual(['d', 'c', 'b', 'a', 'e']);
  });
});

describe('initialPrinting', () => {
  it('prefers the first English printing', () => {
    const list = [printing({ scryfallId: 'jp', lang: 'ja' }), printing({ scryfallId: 'en2' }), printing({ scryfallId: 'en3' })];
    expect(initialPrinting(list).scryfallId).toBe('en2');
  });

  it('falls back to the first', () => {
    expect(initialPrinting([printing({ scryfallId: 'x', lang: 'fr' }), printing({ scryfallId: 'y', lang: 'de' })]).scryfallId).toBe('x');
  });
});

describe('filterPrintings', () => {
  const list = [
    printing({ scryfallId: 'a', setName: 'Jötun Realms', setCode: 'jtn' }),
    printing({ scryfallId: 'b', setName: 'Core Set', setCode: 'm21' }),
    printing({ scryfallId: 'c', setName: 'Commander Legends', setCode: 'cmr' }),
  ];

  it('matches the set name ignoring case and accents', () => {
    expect(filterPrintings(list, 'JOTUN', 'zzz').map((p) => p.scryfallId)).toEqual(['a']);
  });

  it('matches a set code by prefix', () => {
    expect(filterPrintings(list, 'm2', 'zzz').map((p) => p.scryfallId)).toEqual(['b']);
  });

  it('always keeps the selected printing', () => {
    expect(filterPrintings(list, 'cmr', 'b').map((p) => p.scryfallId)).toEqual(['b', 'c']);
  });

  it('returns everything for an empty text', () => {
    expect(filterPrintings(list, '  ', 'a')).toHaveLength(3);
  });
});

describe('printingIdentity', () => {
  it('copies the identity with an uppercased set code and the artist', () => {
    expect(printingIdentity(detail(), printing())).toEqual({
      name: 'Lightning Bolt',
      scryfallId: 's1',
      oracleId: 'o1',
      setCode: 'LEA',
      setName: 'Limited Edition Alpha',
      collectorNumber: '161',
      rarity: 'common',
      commanderLegality: 'legal',
      colorIdentity: ['R'],
      typeLine: 'Instant',
      imageUrl: 'https://img/front.jpg',
      faces: undefined,
      artist: 'Christopher Rush',
    });
  });

  it('omits the artist when the printing has none', () => {
    expect('artist' in printingIdentity(detail(), printing({ artist: null }))).toBe(false);
  });

  it('falls back from the printing image to the first face, then to an empty string', () => {
    const faces = [
      { name: 'Front', imageUrl: 'https://img/f.jpg' },
      { name: 'Back', imageUrl: 'https://img/b.jpg' },
    ];
    expect(printingIdentity(detail(), printing({ imageUrl: null, faces })).imageUrl).toBe('https://img/f.jpg');
    expect(printingIdentity(detail(), printing({ imageUrl: null })).imageUrl).toBe('');
  });

  it('keeps faces only when two or more have images', () => {
    const two = [
      { name: 'Front', imageUrl: 'https://img/f.jpg' },
      { name: 'Back', imageUrl: 'https://img/b.jpg' },
    ];
    expect(printingIdentity(detail(), printing({ faces: two })).faces).toEqual(two);
    expect(printingIdentity(detail(), printing({ faces: [two[0], { name: 'Back', imageUrl: '' }] })).faces).toBeUndefined();
  });
});

describe('entryFromPrinting', () => {
  const details = { finish: 'foil' as const, language: 'pt', condition: 'LP' as const, quantity: 3, forSale: true, notes: '  capa  ' };

  it('builds the owned fields on top of the identity', () => {
    const entry = entryFromPrinting(detail({ typeLine: 'Legendary Creature — Elf' }), printing(), details, 'loc-1');
    expect(entry).toMatchObject({
      finish: 'foil',
      language: 'pt',
      condition: 'LP',
      quantity: 3,
      forSale: true,
      notes: 'capa',
      locationId: 'loc-1',
      canBeCommander: true,
      setCode: 'LEA',
    });
  });

  it('leaves empty notes absent', () => {
    expect(entryFromPrinting(detail(), printing(), { ...details, notes: '   ' }, 'x').notes).toBeUndefined();
  });
});

describe('validateQuantity', () => {
  it('accepts whole numbers from 1 to 9999', () => {
    expect(validateQuantity('1')).toEqual({ ok: true, value: 1 });
    expect(validateQuantity('9999')).toEqual({ ok: true, value: 9999 });
    expect(validateQuantity('007')).toEqual({ ok: true, value: 7 });
  });

  it.each(['0', '1.5', 'abc', '10000', ' 3', '', '-2'])('rejects %j', (text) => {
    expect(validateQuantity(text)).toEqual({ ok: false });
  });
});

describe('detailsLine', () => {
  it('joins finish, language and condition', () => {
    expect(detailsLine({ finish: 'foil', language: 'en', condition: 'NM' })).toBe('Foil · EN · NM');
    expect(detailsLine({ finish: 'nonfoil', language: 'kr', condition: 'DMG' })).toBe('Normal · KO · DMG');
  });
});

describe('matchKey', () => {
  it('joins printing, finish, language and condition', () => {
    expect(matchKey(mockCardEntry({ scryfallId: 's9', finish: 'foil', language: 'jp', condition: 'LP' }))).toBe(
      's9|foil|jp|LP',
    );
  });
});

describe('findMatches', () => {
  const collection = (id: string, name: string): Collection => ({
    id,
    name,
    color: '#d8cdb0',
    parentId: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
  const byId = new Map([
    ['dest', collection('dest', 'Zebra')],
    ['a', collection('a', 'Árvore')],
    ['b', collection('b', 'Bolsa')],
  ]);
  const pathName = (id: string) => byId.get(id)!.name;
  const key = matchKey(mockCardEntry());

  it('ignores deck and holding-box rows', () => {
    const cards = [mockCardEntry({ id: 'in-deck', locationId: 'deck-1' }), mockCardEntry({ id: 'loose', locationId: 'gone' })];
    expect(findMatches(cards, key, byId, 'dest', pathName)).toEqual([]);
  });

  it('ignores rows with another finish, language, condition or printing', () => {
    const cards = [
      mockCardEntry({ id: 'f', locationId: 'a', finish: 'foil' }),
      mockCardEntry({ id: 'l', locationId: 'a', language: 'pt' }),
      mockCardEntry({ id: 'c', locationId: 'a', condition: 'MP' }),
      mockCardEntry({ id: 's', locationId: 'a', scryfallId: 'other' }),
    ];
    expect(findMatches(cards, key, byId, 'dest', pathName)).toEqual([]);
  });

  it('leaves out the edited row', () => {
    const cards = [mockCardEntry({ id: 'me', locationId: 'a' }), mockCardEntry({ id: 'other', locationId: 'b' })];
    expect(findMatches(cards, key, byId, 'dest', pathName, 'me').map((m) => m.card.id)).toEqual(['other']);
  });

  it('orders the destination first, then PT-BR path name, then quantity desc; one entry per row', () => {
    const cards = [
      mockCardEntry({ id: 'b1', locationId: 'b', quantity: 1 }),
      mockCardEntry({ id: 'a1', locationId: 'a', quantity: 1 }),
      mockCardEntry({ id: 'a5', locationId: 'a', quantity: 5 }),
      mockCardEntry({ id: 'd1', locationId: 'dest', quantity: 1 }),
    ];
    const matches = findMatches(cards, key, byId, 'dest', pathName);
    expect(matches.map((m) => m.card.id)).toEqual(['d1', 'a5', 'a1', 'b1']);
    expect(matches[1].collection).toBe(byId.get('a'));
  });
});

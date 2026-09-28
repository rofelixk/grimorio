import { describe, expect, it } from 'vitest';
import type { Deck } from '@models/deck.model';
import { compareDeckNames, repairDeckNames, validateDeckName } from './deck.util';

function deck(id: string, name: string): Deck {
  return { id, name, format: 'commander', updatedAt: '2026-01-01T00:00:00.000Z' };
}

describe('validateDeckName', () => {
  it('rejects an empty or blank name', () => {
    expect(validateDeckName('', [])).toBe('empty');
    expect(validateDeckName('   ', [])).toBe('empty');
  });

  it('rejects a name over 40 characters', () => {
    expect(validateDeckName('a'.repeat(41), [])).toBe('too-long');
  });

  it('accepts 40 characters with surrounding spaces', () => {
    expect(validateDeckName(`  ${'a'.repeat(40)}  `, [])).toBeNull();
  });

  it('rejects a duplicate ignoring case, accents and surrounding spaces', () => {
    expect(validateDeckName('krênko GOBLINS ', [deck('d1', 'Krenko goblins')])).toBe('taken');
  });

  it('excludes the deck itself on rename', () => {
    expect(validateDeckName('KRENKO goblins', [deck('d1', 'Krenko goblins')], 'd1')).toBeNull();
  });
});

describe('repairDeckNames', () => {
  const now = '2026-09-28T12:00:00.000Z';

  it('keeps the remote member and renames the local one', () => {
    const { decks, renamed } = repairDeckNames([deck('b', 'Elfos'), deck('a', 'elfos')], new Set(['b']), now);
    expect(decks.map((d) => d.name)).toEqual(['Elfos', 'elfos (2)']);
    expect(renamed).toEqual([{ ...deck('a', 'elfos'), name: 'elfos (2)', updatedAt: now }]);
  });

  it('numbers three duplicates (2), (3) by id, the lowest id surviving', () => {
    const { decks } = repairDeckNames([deck('c', 'Elfos'), deck('a', 'Elfos'), deck('b', 'Élfos')], new Set(), now);
    expect(decks.map((d) => [d.id, d.name])).toEqual([
      ['c', 'Elfos (3)'],
      ['a', 'Elfos'],
      ['b', 'Élfos (2)'],
    ]);
  });

  it('skips a suffix already in use', () => {
    const { decks } = repairDeckNames([deck('a', 'Elfos'), deck('b', 'Elfos'), deck('c', 'Elfos (2)')], new Set(), now);
    expect(decks.find((d) => d.id === 'b')?.name).toBe('Elfos (3)');
  });

  it('cuts a 40-character base to fit', () => {
    const long = 'a'.repeat(40);
    const { renamed } = repairDeckNames([deck('a', long), deck('b', long)], new Set(), now);
    expect(renamed[0].name).toBe(`${'a'.repeat(36)} (2)`);
    expect(renamed[0].name).toHaveLength(40);
  });

  it('renames nothing without duplicates', () => {
    const input = [deck('a', 'Elfos'), deck('b', 'Goblins')];
    const { decks, renamed } = repairDeckNames(input, new Set(), now);
    expect(renamed).toEqual([]);
    expect(decks).toEqual(input);
  });
});

describe('compareDeckNames', () => {
  it('sorts in pt-BR order ignoring case and accents', () => {
    const sorted = [deck('1', 'zur'), deck('2', 'Élesh'), deck('3', 'Atraxa')].sort(compareDeckNames);
    expect(sorted.map((d) => d.name)).toEqual(['Atraxa', 'Élesh', 'zur']);
  });

  it('breaks ties by id', () => {
    const sorted = [deck('b', 'Elfos'), deck('a', 'elfos')].sort(compareDeckNames);
    expect(sorted.map((d) => d.id)).toEqual(['a', 'b']);
  });
});

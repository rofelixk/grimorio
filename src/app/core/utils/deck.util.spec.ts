import { describe, expect, it } from 'vitest';
import type { Deck } from '@models/deck.model';
import { compareDeckNames, validateDeckName } from './deck.util';

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

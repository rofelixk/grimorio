import { describe, expect, it } from 'vitest';
import { mockCardEntry } from '@testing/card.mocks';
import { matchesCardQuery, normalizeSearchText } from './text-search.util';

describe('normalizeSearchText', () => {
  it('strips diacritics and lowercases', () => {
    expect(normalizeSearchText('Sól Ring')).toBe('sol ring');
  });
});

describe('matchesCardQuery', () => {
  it('matches by name, case and diacritic-insensitively', () => {
    const card = mockCardEntry({ name: 'Sol Ring' });

    expect(matchesCardQuery(card, 'sól')).toBe(true);
    expect(matchesCardQuery(card, 'SOL RING')).toBe(true);
  });

  it('matches by set code', () => {
    const card = mockCardEntry({ setCode: 'LTC' });

    expect(matchesCardQuery(card, 'ltc')).toBe(true);
  });

  it('matches by collector number', () => {
    const card = mockCardEntry({ collectorNumber: '279' });

    expect(matchesCardQuery(card, '279')).toBe(true);
  });

  it('does not match unrelated text', () => {
    const card = mockCardEntry({ name: 'Sol Ring', setCode: 'LTC', collectorNumber: '279' });

    expect(matchesCardQuery(card, 'lightning bolt')).toBe(false);
  });
});

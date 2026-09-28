import { describe, expect, it } from 'vitest';
import { planarCard } from '@testing/planechase-fixtures';
import { planarCardText } from './planar-card-text.util';

describe('planarCardText', () => {
  it('splits a translated plane into lines under the Caos plate', () => {
    expect(planarCardText(planarCard('p01'))).toEqual({
      lang: null,
      text: ['Texto de p01.', 'Segunda linha de p01.'],
      ability: ['Sempre que o caos se instaurar, p01 faz algo.'],
      plateLabel: 'Caos',
    });
  });

  it('marks an untranslated card as English', () => {
    const text = planarCardText(planarCard('p09'));
    expect(text.lang).toBe('en');
    expect(text.text).toEqual(['Static text of p09.', 'Second line of p09.']);
  });

  it('gives a phenomenon no static text and the encounter label', () => {
    const text = planarCardText(planarCard('f01'));
    expect(text.text).toEqual([]);
    expect(text.plateLabel).toBe('Ao encontrar');
    expect(text.ability).toHaveLength(1);
  });

  it('gives a plane with no chaos ability no plate', () => {
    expect(planarCardText(planarCard('p11')).ability).toBeNull();
  });

  it('drops blank lines', () => {
    const text = planarCardText({ ...planarCard('p01'), text: 'One.\n\n  \nTwo.' });
    expect(text.text).toEqual(['One.', 'Two.']);
  });
});

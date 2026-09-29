import { describe, expect, it } from 'vitest';
import { DECK_FORMATS } from '@models/deck.model';
import { DECK } from './deck-copy';

describe('deck-copy', () => {
  describe('deleteWithCards', () => {
    it('uses the singular text for 1 card', () => {
      expect(DECK.deleteWithCards(1)).toBe(
        'A carta deste deck vai para a caixa temporária, com todos os dados, até você guardá-la em outro lugar. Nada mais é afetado.',
      );
    });

    it('uses the plural text with pt-BR grouping', () => {
      expect(DECK.deleteWithCards(1240)).toBe(
        'As 1.240 cartas deste deck vão para a caixa temporária, com todos os dados, até você guardá-las em outro lugar. Nada mais é afetado.',
      );
    });
  });

  describe('toastMoved', () => {
    it('uses the singular text for 1 card', () => {
      expect(DECK.toastMoved('Elfos', 1)).toBe('Elfos foi excluído. 1 carta foi para a caixa temporária.');
    });

    it('uses the plural text with pt-BR grouping', () => {
      expect(DECK.toastMoved('Elfos', 1240)).toBe('Elfos foi excluído. 1.240 cartas foram para a caixa temporária.');
    });
  });

  it('gives every format a name and at least one rule', () => {
    for (const id of DECK_FORMATS) {
      expect(DECK.formats[id].name).not.toBe('');
      expect(DECK.formats[id].rules.length).toBeGreaterThan(0);
    }
  });

  it('lists the Vintage bullets in order', () => {
    expect(DECK.formats.vintage.rules).toEqual([
      'Mínimo de 60 cartas.',
      'Sideboard de até 15 cartas.',
      'Até 4 cópias de cada carta, exceto terrenos básicos.',
      'Cartas de todas as coleções.',
      'Cartas da lista de restritas: só 1 cópia.',
    ]);
  });
});

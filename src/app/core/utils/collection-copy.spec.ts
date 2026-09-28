import { describe, expect, it } from 'vitest';
import { COLLECTION, formatCount, plural } from './collection-copy';

describe('collection-copy', () => {
  describe('formatCount / plural', () => {
    it('formats with pt-BR grouping', () => {
      expect(formatCount(1240)).toBe('1.240');
    });

    it('uses the singular word for 1', () => {
      expect(plural(1, 'carta', 'cartas')).toBe('1 carta');
    });

    it('uses the plural word and pt-BR grouping otherwise', () => {
      expect(plural(1240, 'carta', 'cartas')).toBe('1.240 cartas');
    });
  });

  describe('COLLECTION.meta', () => {
    it('returns "Vazia" when there are no cards and no subcollections', () => {
      expect(COLLECTION.meta({ cards: 0, sale: 0, subs: 0 })).toBe('Vazia');
    });

    it('uses the singular word for a single card and omits the subcollection part', () => {
      expect(COLLECTION.meta({ cards: 1, sale: 0, subs: 0 })).toBe('1 carta · 0 à venda');
    });

    it('uses the singular word for a single subcollection', () => {
      expect(COLLECTION.meta({ cards: 1, sale: 0, subs: 1 })).toBe('1 carta · 0 à venda · 1 subcoleção');
    });

    it('omits the subcollection part when there are none', () => {
      expect(COLLECTION.meta({ cards: 3, sale: 1, subs: 0 })).toBe('3 cartas · 1 à venda');
    });

    it('formats large counts with pt-BR grouping', () => {
      expect(COLLECTION.meta({ cards: 1240, sale: 3, subs: 2 })).toBe(
        '1.240 cartas · 3 à venda · 2 subcoleções',
      );
    });
  });

  describe('COLLECTION.toastMoved', () => {
    it('uses the singular form for 1 card', () => {
      expect(COLLECTION.toastMoved('Fichário', 1)).toBe(
        'Fichário foi excluída. 1 carta foi para a caixa temporária.',
      );
    });

    it('uses the plural form otherwise', () => {
      expect(COLLECTION.toastMoved('Fichário', 2)).toBe(
        'Fichário foi excluída. 2 cartas foram para a caixa temporária.',
      );
    });
  });

  describe('COLLECTION.toastDeleted', () => {
    it('uses the singular word for 1 card but keeps "foram"', () => {
      expect(COLLECTION.toastDeleted('Fichário', 1)).toBe('Fichário e 1 carta foram excluídas.');
    });

    it('uses the plural word otherwise', () => {
      expect(COLLECTION.toastDeleted('Fichário', 2)).toBe('Fichário e 2 cartas foram excluídas.');
    });
  });

  describe('COLLECTION.deleteSubsGo', () => {
    it('uses the singular sentence for 1', () => {
      expect(COLLECTION.deleteSubsGo(1)).toBe('A subcoleção vai junto.');
    });

    it('uses the plural sentence otherwise', () => {
      expect(COLLECTION.deleteSubsGo(3)).toBe('As 3 subcoleções vão junto.');
    });
  });
});

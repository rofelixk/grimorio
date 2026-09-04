import { destacarTermo } from './destaque-texto';

describe('destacarTermo', () => {
  it('splits the text around the first case-insensitive match', () => {
    expect(destacarTermo('Lightning Bolt', 'light')).toEqual({
      antes: '',
      trecho: 'Light',
      depois: 'ning Bolt',
    });
  });

  it('matches in the middle of the text', () => {
    expect(destacarTermo('Ajani Resolute', 'reso')).toEqual({
      antes: 'Ajani ',
      trecho: 'Reso',
      depois: 'lute',
    });
  });

  it('returns the whole text unmatched when the term is not found', () => {
    expect(destacarTermo('Lightning Bolt', 'zzz')).toEqual({
      antes: 'Lightning Bolt',
      trecho: '',
      depois: '',
    });
  });

  it('returns the whole text unmatched when the term is empty', () => {
    expect(destacarTermo('Lightning Bolt', '   ')).toEqual({
      antes: 'Lightning Bolt',
      trecho: '',
      depois: '',
    });
  });
});

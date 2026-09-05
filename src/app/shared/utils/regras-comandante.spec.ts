import { ICarta } from '@shared/interfaces';
import {
  dentroDaIdentidade,
  ehTerraBasica,
  elegivelComoComandante,
  permiteCopiasIlimitadas,
} from './regras-comandante';

function criarCarta(sobrescritas: Partial<ICarta.Detalhes> = {}): ICarta.Detalhes {
  return {
    oracle_id: 'id',
    name: 'Carta de Teste',
    mana_cost: '{1}{G}',
    mana_value: 2,
    type_line: 'Creature — Bear',
    oracle_text: null,
    color_identity: ['G'],
    power: '2',
    toughness: '2',
    loyalty: null,
    layout: 'normal',
    commander_legality: 'legal',
    image_url: null,
    card_faces: null,
    ...sobrescritas,
  };
}

describe('elegivelComoComandante', () => {
  it('accepts a Legendary Creature', () => {
    expect(elegivelComoComandante(criarCarta({ type_line: 'Legendary Creature — Human Wizard' }))).toBe(true);
  });

  it('rejects a non-legendary creature', () => {
    expect(elegivelComoComandante(criarCarta({ type_line: 'Creature — Bear' }))).toBe(false);
  });

  it('rejects a Legendary non-creature (e.g. a planeswalker without special text)', () => {
    expect(elegivelComoComandante(criarCarta({ type_line: 'Legendary Planeswalker — Ajani' }))).toBe(false);
  });

  it('accepts any card whose oracle text says it can be a commander', () => {
    expect(
      elegivelComoComandante(
        criarCarta({
          type_line: 'Legendary Planeswalker — Ajani',
          oracle_text: 'Ajani, Sunstriker can be your commander.',
        }),
      ),
    ).toBe(true);
  });

  it('uses face 0 for multiface cards', () => {
    expect(
      elegivelComoComandante(
        criarCarta({
          type_line: null,
          oracle_text: null,
          layout: 'transform',
          card_faces: [
            {
              name: 'Front',
              mana_cost: '{1}{G}',
              type_line: 'Legendary Creature — Human',
              oracle_text: null,
              colors: ['G'],
              power: '2',
              toughness: '2',
              image_url: null,
            },
            {
              name: 'Back',
              mana_cost: '',
              type_line: 'Legendary Creature — Werewolf',
              oracle_text: null,
              colors: ['G'],
              power: '4',
              toughness: '4',
              image_url: null,
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});

describe('ehTerraBasica', () => {
  it('accepts a basic land', () => {
    expect(ehTerraBasica(criarCarta({ type_line: 'Basic Land — Forest' }))).toBe(true);
  });

  it('rejects a nonbasic land', () => {
    expect(ehTerraBasica(criarCarta({ type_line: 'Land' }))).toBe(false);
  });
});

describe('permiteCopiasIlimitadas', () => {
  it('accepts a card with the standard unlimited-copies text', () => {
    expect(
      permiteCopiasIlimitadas(
        criarCarta({ oracle_text: 'A deck can have any number of cards named Relentless Rats.' }),
      ),
    ).toBe(true);
  });

  it('rejects a card without that text', () => {
    expect(permiteCopiasIlimitadas(criarCarta({ oracle_text: 'Flying' }))).toBe(false);
  });

  it('rejects a card with null oracle text', () => {
    expect(permiteCopiasIlimitadas(criarCarta({ oracle_text: null }))).toBe(false);
  });
});

describe('dentroDaIdentidade', () => {
  it('accepts a card whose identity is a subset of the commander', () => {
    expect(dentroDaIdentidade(['G'], ['G', 'U'])).toBe(true);
  });

  it('accepts a colorless card under any commander', () => {
    expect(dentroDaIdentidade([], ['G', 'U'])).toBe(true);
  });

  it('accepts an exact identity match', () => {
    expect(dentroDaIdentidade(['G', 'U'], ['G', 'U'])).toBe(true);
  });

  it('rejects a card with a color outside the commander identity', () => {
    expect(dentroDaIdentidade(['G', 'R'], ['G', 'U'])).toBe(false);
  });
});

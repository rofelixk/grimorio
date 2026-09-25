import { describe, expect, it } from 'vitest';
import { Color } from '@models/profile.model';
import { DEFAULT_IDENTITY, IDENTITY_HEX, colorNames, rolesFor, tribeName } from './identity.util';

const TRIBES: [string, string][] = [
  ['W', 'Mono-branco'],
  ['U', 'Mono-azul'],
  ['B', 'Mono-preto'],
  ['R', 'Mono-vermelho'],
  ['G', 'Mono-verde'],
  ['WU', 'Azorius'],
  ['WB', 'Orzhov'],
  ['WR', 'Boros'],
  ['WG', 'Selesnya'],
  ['UB', 'Dimir'],
  ['UR', 'Izzet'],
  ['UG', 'Simic'],
  ['BR', 'Rakdos'],
  ['BG', 'Golgari'],
  ['RG', 'Gruul'],
  ['WUB', 'Esper'],
  ['WUR', 'Jeskai'],
  ['WUG', 'Bant'],
  ['WBR', 'Mardu'],
  ['WBG', 'Abzan'],
  ['WRG', 'Naya'],
  ['UBR', 'Grixis'],
  ['UBG', 'Sultai'],
  ['URG', 'Temur'],
  ['BRG', 'Jund'],
];

const colors = (key: string) => key.split('') as Color[];

describe('identity.util', () => {
  it.each(TRIBES)('names %s as %s regardless of pick order', (key, name) => {
    expect(tribeName(colors(key))).toBe(name);
    expect(tribeName(colors(key).reverse())).toBe(name);
  });

  it('has no tribe for no colors', () => {
    expect(tribeName([])).toBe('');
  });

  it('maps one color to every role', () => {
    const roles = rolesFor(['B']);

    expect(roles.primary).toBe(IDENTITY_HEX.B.base);
    expect(roles.accent).toBe(IDENTITY_HEX.B.base);
    expect(roles.tertiary).toBe(IDENTITY_HEX.B.base);
    expect(roles.tertiaryHover).toBe(IDENTITY_HEX.B.hover);
  });

  it('falls tertiary back to accent (not primary) with two colors', () => {
    const roles = rolesFor(['U', 'R']);

    expect(roles.primary).toBe(IDENTITY_HEX.U.base);
    expect(roles.accent).toBe(IDENTITY_HEX.R.base);
    expect(roles.tertiary).toBe(IDENTITY_HEX.R.base);
  });

  it('uses pick order for three colors', () => {
    const roles = rolesFor(['G', 'W', 'B']);

    expect([roles.primary, roles.accent, roles.tertiary]).toEqual([
      IDENTITY_HEX.G.base,
      IDENTITY_HEX.W.base,
      IDENTITY_HEX.B.base,
    ]);
    expect(roles.primaryHover).toBe(IDENTITY_HEX.G.hover);
    expect(roles.accentHover).toBe(IDENTITY_HEX.W.hover);
  });

  it('names colors in pick order, with Preto for black', () => {
    expect(colorNames(['U', 'R'])).toBe('Azul · Vermelho');
    expect(colorNames(['B', 'W', 'G'])).toBe('Preto · Branco · Verde');
  });

  it('defaults to Vermelho → Azul → Verde', () => {
    expect(DEFAULT_IDENTITY).toEqual(['R', 'U', 'G']);
    const roles = rolesFor(DEFAULT_IDENTITY);
    expect([roles.primary, roles.accent, roles.tertiary]).toEqual([
      IDENTITY_HEX.R.base,
      IDENTITY_HEX.U.base,
      IDENTITY_HEX.G.base,
    ]);
  });
});

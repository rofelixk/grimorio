import { describe, expect, it } from 'vitest';
import type { Color } from '@models/card.model';
import { cardPalette, rolesFromHex } from './card-colors.util';
import { IDENTITY_HEX, rolesFor } from './identity.util';

describe('cardPalette', () => {
  it('colorless is neutral', () => {
    const { stops, roles } = cardPalette([]);
    expect(stops).toEqual(['#a89e96', '#6b635c']);
    expect(roles.primary).toBe('#a89e96');
    expect(roles.primaryHover).toBe('#c2b9b1');
  });

  it('one color is that color', () => {
    const { stops, roles } = cardPalette(['R']);
    expect(stops).toEqual([IDENTITY_HEX.R.base]);
    expect(roles).toEqual(rolesFor(['R']));
  });

  it('two and three colors follow in turn', () => {
    expect(cardPalette(['U', 'R']).stops).toEqual([IDENTITY_HEX.U.base, IDENTITY_HEX.R.base]);
    const three = cardPalette(['W', 'U', 'B']);
    expect(three.stops).toEqual([IDENTITY_HEX.W.base, IDENTITY_HEX.U.base, IDENTITY_HEX.B.base]);
    expect(three.roles).toEqual(rolesFor(['W', 'U', 'B']));
  });

  it('orders an unordered input WUBRG', () => {
    const input: Color[] = ['G', 'W', 'R'];
    expect(cardPalette(input).stops).toEqual([IDENTITY_HEX.W.base, IDENTITY_HEX.R.base, IDENTITY_HEX.G.base]);
  });

  it('four colors are silver, with the light variant on hover', () => {
    const { stops, roles } = cardPalette(['W', 'U', 'B', 'R']);
    expect(stops).toEqual(['#b6b8c2', '#e8e9ee', '#8d8f9b']);
    expect(roles.primary).toBe('#b6b8c2');
    expect(roles.primaryHover).toBe('#e8e9ee');
  });

  it('five colors are gold, with the light variant on hover', () => {
    const { stops, roles } = cardPalette(['W', 'U', 'B', 'R', 'G']);
    expect(stops).toEqual(['#c49a3c', '#f0d98a', '#9a7424']);
    expect(roles.accentHover).toBe('#f0d98a');
  });
});

describe('rolesFromHex', () => {
  it('sets every role and hover to the hex', () => {
    expect(Object.values(rolesFromHex('#3d6b85'))).toEqual(Array(6).fill('#3d6b85'));
  });
});

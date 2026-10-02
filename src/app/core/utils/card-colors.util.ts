// How a card's color identity colors its hover and its modals (spec 015, R12). Reuses the profile
// identity's bases and `rolesFor`; 4 colors read silver, 5 gold, colorless neutral.

import type { Color } from '@models/card.model';
import { COLOR_ORDER, type Roles, rolesFor } from './identity.util';

export interface CardPalette {
  /** The border's conic-gradient stops, in order. */
  stops: string[];
  roles: Roles;
}

const SILVER = { main: '#b6b8c2', light: '#e8e9ee', dark: '#8d8f9b' };
const GOLD = { main: '#c49a3c', light: '#f0d98a', dark: '#9a7424' };
const NEUTRAL = { main: '#a89e96', dark: '#6b635c', hover: '#c2b9b1' };

/** All three roles that hex, hover the same hex. */
export function rolesFromHex(hex: string): Roles {
  return {
    primary: hex,
    primaryHover: hex,
    accent: hex,
    accentHover: hex,
    tertiary: hex,
    tertiaryHover: hex,
  };
}

function metalRoles(metal: typeof SILVER): Roles {
  return {
    primary: metal.main,
    primaryHover: metal.light,
    accent: metal.main,
    accentHover: metal.light,
    tertiary: metal.main,
    tertiaryHover: metal.light,
  };
}

export function cardPalette(colorIdentity: readonly Color[]): CardPalette {
  const colors = COLOR_ORDER.filter((c) => colorIdentity.includes(c));
  if (colors.length === 0) {
    return {
      stops: [NEUTRAL.main, NEUTRAL.dark],
      roles: { ...rolesFromHex(NEUTRAL.main), primaryHover: NEUTRAL.hover, accentHover: NEUTRAL.hover, tertiaryHover: NEUTRAL.hover },
    };
  }
  if (colors.length === 4) {
    return { stops: [SILVER.main, SILVER.light, SILVER.dark], roles: metalRoles(SILVER) };
  }
  if (colors.length === 5) {
    return { stops: [GOLD.main, GOLD.light, GOLD.dark], roles: metalRoles(GOLD) };
  }
  const roles = rolesFor(colors);
  const stops = [roles.primary, roles.accent, roles.tertiary].slice(0, colors.length);
  return { stops, roles };
}

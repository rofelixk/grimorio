import { Color } from '@models/profile.model';

/** W U B R G — the lookup order for tribe names and the wheel's clockwise swatch order. */
export const COLOR_ORDER: readonly Color[] = ['W', 'U', 'B', 'R', 'G'];

/** The app's own identity when no profile is active (FR-012). It belongs to no one: it only
 * tints chrome, and the identity wheel stays neutral. */
export const DEFAULT_IDENTITY: readonly Color[] = ['R', 'U', 'G'];

export const COLOR_NAME: Record<Color, string> = {
  W: 'Branco',
  U: 'Azul',
  B: 'Preto',
  R: 'Vermelho',
  G: 'Verde',
};

/** `--identity-*` base / hover values from tokens.css (DESIGN.md "Identity colors"). */
export const IDENTITY_HEX: Record<Color, { base: string; hover: string }> = {
  W: { base: '#d8cdb0', hover: '#e6dcc2' },
  U: { base: '#3d6b85', hover: '#4c7f9c' },
  B: { base: '#7c5aa6', hover: '#8f6bb8' },
  R: { base: '#a8402c', hover: '#bf4f39' },
  G: { base: '#4c7a43', hover: '#5c8f52' },
};

const TRIBE: Record<string, string> = {
  W: 'Mono-branco',
  U: 'Mono-azul',
  B: 'Mono-preto',
  R: 'Mono-vermelho',
  G: 'Mono-verde',
  WU: 'Azorius',
  WB: 'Orzhov',
  WR: 'Boros',
  WG: 'Selesnya',
  UB: 'Dimir',
  UR: 'Izzet',
  UG: 'Simic',
  BR: 'Rakdos',
  BG: 'Golgari',
  RG: 'Gruul',
  WUB: 'Esper',
  WUR: 'Jeskai',
  WUG: 'Bant',
  WBR: 'Mardu',
  WBG: 'Abzan',
  WRG: 'Naya',
  UBR: 'Grixis',
  UBG: 'Sultai',
  URG: 'Temur',
  BRG: 'Jund',
};

export interface Roles {
  primary: string;
  primaryHover: string;
  accent: string;
  accentHover: string;
  tertiary: string;
  tertiaryHover: string;
}

// Pick order = role order; unset roles fall back tertiary → accent → primary.
export function rolesFor(colors: readonly Color[]): Roles {
  const primary = colors[0] ?? DEFAULT_IDENTITY[0];
  const accent = colors[1] ?? primary;
  const tertiary = colors[2] ?? accent;
  return {
    primary: IDENTITY_HEX[primary].base,
    primaryHover: IDENTITY_HEX[primary].hover,
    accent: IDENTITY_HEX[accent].base,
    accentHover: IDENTITY_HEX[accent].hover,
    tertiary: IDENTITY_HEX[tertiary].base,
    tertiaryHover: IDENTITY_HEX[tertiary].hover,
  };
}

/** The tribe name, keyed by the colors sorted in W U B R G order; '' for no colors. */
export function tribeName(colors: readonly Color[]): string {
  return TRIBE[COLOR_ORDER.filter((c) => colors.includes(c)).join('')] ?? '';
}

/** Color names in pick order, joined with " · ". */
export function colorNames(colors: readonly Color[]): string {
  return colors.map((c) => COLOR_NAME[c]).join(' · ');
}

export function sameColors(a: readonly Color[] | null | undefined, b: readonly Color[] | null | undefined): boolean {
  return !!a && !!b && a.length === b.length && a.every((c, i) => c === b[i]);
}

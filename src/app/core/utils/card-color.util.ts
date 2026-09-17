import { Color } from '@models/card.model';

// Deliberately separate from ThemeService's THEME_COLOR_PALETTE, which is
// desaturated to suit the theme picker's own UI — DESIGN.md requires the
// five MTG color-identity pip colors to stay their traditional print
// colors so they read as recognizable Magic colors, not app-brand tokens.
// Black's print color (a near-black) wouldn't register as a visible glow
// against this app's own near-black background, so it's approximated here
// as a bright violet instead — dark enough to still read as "black mana,"
// bright enough to actually glow.
export const MTG_PRINT_COLORS: Record<Color, string> = {
  W: '#f8f6d8',
  U: '#0e68ab',
  B: '#8b5cc4',
  R: '#d3202a',
  G: '#00733e',
};

export const COLORLESS_GLOW = '#8a8378';
export const FOUR_COLOR_GLOW = '#c9d1d9';
export const FIVE_COLOR_GLOW = '#d4af37';

// Maps a card's color identity to the glow color(s) its selection-moment
// ring should cycle through: mono-colored cards glow that one hue,
// 2-3 colors rotate between them, 4 colors is silver, 5 is gold, and no
// colors (artifacts/lands) is a muted neutral gray.
export function getCardGlowColors(colorIdentity: Color[]): string[] {
  if (colorIdentity.length === 0) {
    return [COLORLESS_GLOW];
  }
  if (colorIdentity.length === 4) {
    return [FOUR_COLOR_GLOW];
  }
  if (colorIdentity.length >= 5) {
    return [FIVE_COLOR_GLOW];
  }
  return colorIdentity.map((color) => MTG_PRINT_COLORS[color]);
}

// The pool a storage location's accent bar is picked from: the five MTG
// color-identity pip colors plus the app's two theme roles, so location
// plates read as part of the same palette as card glows without needing
// their own color field on the StorageLocation model.
const LOCATION_ACCENT_POOL: readonly string[] = [
  ...Object.values(MTG_PRINT_COLORS),
  'var(--color-primary)',
  'var(--color-accent)',
];

// Deterministic hash (djb2) of a location's id into a stable index into
// LOCATION_ACCENT_POOL — same id always yields the same accent color,
// with no color stored on the location itself.
export function getLocationAccent(id: string): string {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 33) ^ id.charCodeAt(i);
  }
  const index = Math.abs(hash) % LOCATION_ACCENT_POOL.length;
  return LOCATION_ACCENT_POOL[index];
}

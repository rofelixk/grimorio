// Collection model (spec 008): a physical storage place for owned cards, nested up to 3 levels.
// Counts, depth and kind are never stored — they're derived by CollectionService (data-model.md).

// The 16-color palette, in row order (DESIGN.md "Collection colors"). The hex is the stored value.
const PALETTE = [
  { name: 'Branco', hex: '#d8cdb0' },
  { name: 'Azul', hex: '#3d6b85' },
  { name: 'Violeta', hex: '#7c5aa6' },
  { name: 'Vermelho', hex: '#a8402c' },
  { name: 'Verde', hex: '#4c7a43' },
  { name: 'Ônix', hex: '#2e2a2a', outline: '#6b635c', ring: '#8a837e' },
  { name: 'Pedra-da-lua', hex: '#b6b8c2' },
  { name: 'Lápis', hex: '#2f4a86' },
  { name: 'Granada', hex: '#7a2e3a' },
  { name: 'Âmbar', hex: '#b8732e' },
  { name: 'Peridoto', hex: '#8ea24a' },
  { name: 'Água-marinha', hex: '#6fa3a6' },
  { name: 'Esmeralda', hex: '#2f7a5c' },
  { name: 'Quartzo rosa', hex: '#c7939a' },
  { name: 'Turmalina', hex: '#a0507a' },
  { name: 'Topázio', hex: '#c49a3c' },
] as const;

/** A palette hex: what `Collection.color` stores. */
export type CollectionColorHex = (typeof PALETTE)[number]['hex'];

export interface Collection {
  id: string;
  name: string;
  color: CollectionColorHex;
  parentId: string | null;
  updatedAt: string;
}

export interface CollectionColor {
  name: string;
  hex: CollectionColorHex;
  /** A dark swatch's outline, so it reads against the page (Ônix: `#6b635c`). */
  outline?: string;
  /** The selected ring's color when the hex itself would vanish (Ônix: `#8a837e`). */
  ring?: string;
}

export const COLLECTION_COLORS: readonly CollectionColor[] = PALETTE;

export const MAX_NAME = 40;
export const MAX_DEPTH = 3;

/** The holding box's route segment (`/collection/caixa`). */
export const HOLDING_REF = 'caixa';

export type NameError = 'empty' | 'too-long' | 'taken';

export type CollectionKind = 'empty' | 'cards' | 'subcollections';

export interface CollectionTotals {
  cards: number;
  sale: number;
  subs: number;
  directEntries: number;
}

export interface CollectionStats {
  byId: Map<string, CollectionTotals>;
  holding: { cards: number; sale: number };
}

/**
 * The palette record for a stored hex. The cloud column is unconstrained text, so a hex outside
 * the palette falls back to the first color rather than breaking the page.
 */
export function colorOf(hex: string): CollectionColor {
  return COLLECTION_COLORS.find((c) => c.hex === hex) ?? COLLECTION_COLORS[0];
}

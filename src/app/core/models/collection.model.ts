// Collection model (spec 008): a physical storage place for owned cards, nested up to 3 levels.
// Counts, depth and kind are never stored — they're derived by CollectionService (data-model.md).

/** The 16-color palette id set, in palette order (data-model.md table). */
export type CollectionColorId =
  | 'branco'
  | 'azul'
  | 'violeta'
  | 'vermelho'
  | 'verde'
  | 'carvao'
  | 'nevoa'
  | 'anil'
  | 'vinho'
  | 'ocre'
  | 'salvia'
  | 'cinza'
  | 'turquesa'
  | 'rosa'
  | 'laranja'
  | 'dourado';

export interface Collection {
  id: string;
  name: string;
  color: CollectionColorId;
  parentId: string | null;
  updatedAt: string;
}

export interface CollectionColor {
  id: CollectionColorId;
  name: string;
  hex: string;
  /** Carvão only: the list-swatch outline (`#6b635c`); the selected-ring color is `CARVAO_RING`. */
  outline?: string;
}

/** The 16 palette colors, in row order (data-model.md). */
export const COLLECTION_COLORS: readonly CollectionColor[] = [
  { id: 'branco', name: 'Branco', hex: '#d8cdb0' },
  { id: 'azul', name: 'Azul', hex: '#3d6b85' },
  { id: 'violeta', name: 'Violeta', hex: '#7c5aa6' },
  { id: 'vermelho', name: 'Vermelho', hex: '#a8402c' },
  { id: 'verde', name: 'Verde', hex: '#4c7a43' },
  { id: 'carvao', name: 'Carvão', hex: '#3a3531', outline: '#6b635c' },
  { id: 'nevoa', name: 'Névoa', hex: '#a3b4b6' },
  { id: 'anil', name: 'Anil', hex: '#565f99' },
  { id: 'vinho', name: 'Vinho', hex: '#7a3553' },
  { id: 'ocre', name: 'Ocre', hex: '#7d5c2e' },
  { id: 'salvia', name: 'Sálvia', hex: '#a6b07c' },
  { id: 'cinza', name: 'Cinza', hex: '#8a837e' },
  { id: 'turquesa', name: 'Turquesa', hex: '#2e8279' },
  { id: 'rosa', name: 'Rosa', hex: '#d197a0' },
  { id: 'laranja', name: 'Laranja', hex: '#c86a28' },
  { id: 'dourado', name: 'Dourado', hex: '#cfab45' },
] as const;

/** Carvão's selected-ring color (distinct from its list-swatch `outline`). */
export const CARVAO_RING = '#8a837e';

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

/** Looks up a palette record by id. */
export function colorOf(id: CollectionColorId): CollectionColor {
  return COLLECTION_COLORS.find((c) => c.id === id)!;
}

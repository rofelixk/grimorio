import type { PlanarCard, PlanarSet } from '../data/planechase/planar-card.model';

/** A viewport rectangle, as `getBoundingClientRect()` reports it. */
export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PopoverBounds {
  viewportWidth: number;
  /** The view area's top edge (below the top bar). */
  top: number;
  /** The deck footer's top edge. */
  bottom: number;
  /** The tile grid, to tell which half the tile sits in. */
  grid: Rect;
}

/** The popover's distance from its tile and from the vertical bounds. */
export const POPOVER_GAP = 12;

/**
 * Where the hover popover goes (FR-006, SC-004): beside its tile, on the right when the tile's
 * center is in the grid's left half and on the left otherwise, switching sides when the preferred
 * one leaves the window; the top follows the tile, clamped between the bounds. When neither side
 * fits, it's centered horizontally above or below the tile, whichever has more room. It never
 * covers the tile.
 */
export function placePopover(
  tile: Rect,
  popover: { width: number; height: number },
  bounds: PopoverBounds,
): { top: number; left: number } {
  const right = tile.left + tile.width + POPOVER_GAP;
  const left = tile.left - popover.width - POPOVER_GAP;
  const fitsRight = right + popover.width <= bounds.viewportWidth;
  const fitsLeft = left >= 0;
  const preferRight = tile.left + tile.width / 2 < bounds.grid.left + bounds.grid.width / 2;
  const minTop = bounds.top + POPOVER_GAP;
  const maxTop = bounds.bottom - POPOVER_GAP - popover.height;

  const [first, second] = preferRight ? [fitsRight && right, fitsLeft && left] : [fitsLeft && left, fitsRight && right];
  const side = first !== false ? first : second;
  if (side !== false) {
    return { top: Math.max(minTop, Math.min(tile.top, maxTop)), left: side };
  }

  const tileBottom = tile.top + tile.height;
  const above = tile.top - bounds.top >= bounds.bottom - tileBottom;
  // Clamped only in the direction away from the tile, so it never slides over it.
  const top = above
    ? Math.min(tile.top - POPOVER_GAP - popover.height, maxTop)
    : Math.max(tileBottom + POPOVER_GAP, minTop);
  return { top, left: Math.max(0, (bounds.viewportWidth - popover.width) / 2) };
}

/** The tiles on screen, in order: every non-collapsed set's cards, sets in catalog order (FR-009a). */
export function visibleOrder(sets: readonly PlanarSet[], collapsed: ReadonlySet<string>): PlanarCard[] {
  return sets.filter((set) => !collapsed.has(set.code)).flatMap((set) => set.cards);
}

import { describe, expect, it } from 'vitest';
import type { PlanarSet } from '../data/planechase/planar-card.model';
import { PLANAR_CARDS } from '@testing/planechase-fixtures';
import { POPOVER_GAP, type PopoverBounds, type Rect, placePopover, visibleOrder } from './planar-preview.util';

// A 1280px window: a 4-column grid from x 240 to 1240, the view area from y 64 to the footer at 900.
const GRID: Rect = { top: 100, left: 240, width: 1000, height: 2000 };
const BOUNDS: PopoverBounds = { viewportWidth: 1280, top: 64, bottom: 900, grid: GRID };
const POPOVER = { width: 380, height: 500 };
const tile = (column: number, top = 200): Rect => ({ top, left: 240 + column * 256, width: 232, height: 166 });

function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
}

function place(t: Rect, bounds = BOUNDS, popover = POPOVER): Rect {
  return { ...placePopover(t, popover, bounds), ...popover };
}

describe('placePopover', () => {
  it('puts a left-half tile’s popover on its right', () => {
    const t = tile(1);
    expect(placePopover(t, POPOVER, BOUNDS)).toEqual({ top: 200, left: t.left + t.width + POPOVER_GAP });
  });

  it('puts a right-half tile’s popover on its left', () => {
    const t = tile(2);
    expect(placePopover(t, POPOVER, BOUNDS)).toEqual({ top: 200, left: t.left - POPOVER.width - POPOVER_GAP });
  });

  it('switches sides when the preferred one leaves the window', () => {
    // A right-half tile too close to the left edge for a popover on its left.
    const bounds = { ...BOUNDS, grid: { ...GRID, left: 0, width: 800 } };
    const t: Rect = { top: 200, left: 300, width: 232, height: 166 };
    expect(placePopover(t, POPOVER, bounds).left).toBe(t.left + t.width + POPOVER_GAP);
    // A left-half tile too close to the right edge.
    const narrow = { ...BOUNDS, viewportWidth: 900, grid: { ...GRID, left: 400, width: 800 } };
    const u: Rect = { top: 200, left: 500, width: 232, height: 166 };
    expect(placePopover(u, POPOVER, narrow).left).toBe(u.left - POPOVER.width - POPOVER_GAP);
  });

  it('clamps the top under the view area and above the footer', () => {
    expect(placePopover(tile(0, 20), POPOVER, BOUNDS).top).toBe(BOUNDS.top + POPOVER_GAP);
    expect(placePopover(tile(0, 800), POPOVER, BOUNDS).top).toBe(BOUNDS.bottom - POPOVER_GAP - POPOVER.height);
  });

  it('centers above the tile when neither side fits and there is more room above', () => {
    const bounds = { ...BOUNDS, viewportWidth: 600, grid: { ...GRID, left: 0, width: 600 } };
    const t: Rect = { top: 700, left: 100, width: 400, height: 150 };
    const popover = { width: 380, height: 300 };
    expect(placePopover(t, popover, bounds)).toEqual({ top: 700 - POPOVER_GAP - 300, left: 110 });
  });

  it('centers below the tile when there is more room below', () => {
    const bounds = { ...BOUNDS, viewportWidth: 600, grid: { ...GRID, left: 0, width: 600 } };
    const t: Rect = { top: 100, left: 100, width: 400, height: 150 };
    const popover = { width: 380, height: 300 };
    expect(placePopover(t, popover, bounds)).toEqual({ top: 250 + POPOVER_GAP, left: 110 });
  });

  it('never covers its tile', () => {
    const narrow = { ...BOUNDS, viewportWidth: 600, grid: { ...GRID, left: 0, width: 600 } };
    const cases: [Rect, PopoverBounds][] = [
      ...[0, 1, 2, 3].flatMap((c) => [20, 200, 500, 800].map((top): [Rect, PopoverBounds] => [tile(c, top), BOUNDS])),
      ...[80, 300, 600, 800].map((top): [Rect, PopoverBounds] => [{ top, left: 16, width: 568, height: 400 }, narrow]),
    ];
    for (const [t, bounds] of cases) {
      expect(intersects(place(t, bounds), t), JSON.stringify(t)).toBe(false);
    }
  });
});

describe('visibleOrder', () => {
  const sets: PlanarSet[] = [
    { code: 'a', name: 'A', cards: PLANAR_CARDS.slice(0, 2) },
    { code: 'b', name: 'B', cards: PLANAR_CARDS.slice(2, 4) },
    { code: 'c', name: 'C', cards: PLANAR_CARDS.slice(4, 6) },
  ];

  it('keeps set order and card order', () => {
    expect(visibleOrder(sets, new Set())).toEqual(PLANAR_CARDS.slice(0, 6));
  });

  it('skips collapsed sets', () => {
    expect(visibleOrder(sets, new Set(['b']))).toEqual([...PLANAR_CARDS.slice(0, 2), ...PLANAR_CARDS.slice(4, 6)]);
  });
});

// The deck area's pages (spec 009 FR-018; DESIGN.md Motion "Decks page change"). Pure, so the
// whole trigger table is unit-testable; the shared page change feeds it what it captured at
// NavigationStart.

import { type PageRule, sweepInfo } from './page-change.util';

export type DeckPlace = { kind: 'list' } | { kind: 'deck'; id: string };

/**
 * - list → deck sweeps open only when the deck tile asked for it (`SWEEP_INFO`), so browser
 *   forward and a typed address swap instantly;
 * - deck → list sweeps closed: the back link, side nav and browser back. The delete landing and
 *   the missing-deck redirect mark themselves `NO_SWEEP_INFO`, which the controller handles;
 * - deck → another deck never sweeps.
 */
export const DECK_PAGES: PageRule<DeckPlace> = {
  initial: { kind: 'list' },
  same: (a, b) => a.kind === b.kind && (a.kind === 'list' || a.id === (b as { id: string }).id),
  sweep: (from, to, nav) => {
    if (from.kind === 'list' && to.kind === 'deck') return sweepInfo(nav) === true ? 'open' : null;
    if (from.kind === 'deck' && to.kind === 'list') return 'close';
    return null;
  },
};

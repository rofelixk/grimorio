// The collection area's pages (spec 008; DESIGN.md Motion "Collections page change"): every
// change sweeps, open going deeper or sideways and closed going up. Pure: a collection place
// carries the depth it had when routed, so one removed mid-change keeps its direction.

import type { PageRule } from './page-change.util';

/** List is depth 0, the holding box depth 1, a collection its tree depth (1-based). */
export type CollectionPlace = { kind: 'list' } | { kind: 'holding' } | { kind: 'collection'; id: string; depth: number };

function depthOf(place: CollectionPlace): number {
  switch (place.kind) {
    case 'list':
      return 0;
    case 'holding':
      return 1;
    case 'collection':
      return place.depth;
  }
}

export const COLLECTION_PAGES: PageRule<CollectionPlace> = {
  initial: { kind: 'list' },
  same: (a, b) => a.kind === b.kind && (a.kind !== 'collection' || a.id === (b as { id: string }).id),
  sweep: (from, to) => (depthOf(to) < depthOf(from) ? 'close' : 'open'),
};

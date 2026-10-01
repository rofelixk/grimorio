// Pure helpers for the collection area's page change (spec 008, research R9): which way a change
// goes. No Angular, no timers — those live in `views/collection-area/collection-transition.ts`.

/** The three places the collection area can show, keyed by the routed `ref` (T018). */
export type Place = { kind: 'list' } | { kind: 'holding' } | { kind: 'collection'; id: string };

/** List is depth 0, the holding box is depth 1, a collection is its tree depth (1-based). */
function placeDepth(place: Place, depthOf: (id: string) => number): number {
  switch (place.kind) {
    case 'list':
      return 0;
    case 'holding':
      return 1;
    case 'collection':
      return depthOf(place.id);
  }
}

/** `-1` when `to` is shallower than `from` (going up), `1` otherwise (deeper or sideways). */
export function transitionDir(from: Place, to: Place, depthOf: (id: string) => number): 1 | -1 {
  return placeDepth(to, depthOf) < placeDepth(from, depthOf) ? -1 : 1;
}

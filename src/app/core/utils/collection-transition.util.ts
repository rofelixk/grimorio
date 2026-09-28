// Pure helpers for the collection area's page transition (spec 008, research R9): where a
// transition is going (direction) and the light-orb burst that plays alongside it. No Angular,
// no timers — the phase/timing state machine lives in `views/collection-area/collection-transition.ts`.

/** The three places the collection area can show, keyed by the routed `ref` (T018). */
export type Place = { kind: 'list' } | { kind: 'holding' } | { kind: 'collection'; id: string };

/** List is depth 0, the holding box is depth 1, a collection is its tree depth (1-based). */
export function placeDepth(place: Place, depthOf: (id: string) => number): number {
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

/** One light orb's animation spec (DESIGN.md Motion "Collections page transition"). */
export interface Orb {
  size: number;
  left: number;
  top: number;
  dx: number;
  dy: number;
  duration: number;
  delay: number;
  role: 0 | 1 | 2;
}

/** The production orb count (`CollectionTransition` always calls `makeOrbs(ORB_COUNT, …)`). */
export const ORB_COUNT = 28;

/**
 * `count` orbs for a transition in direction `dir`. `random` is injected so callers can seed it
 * in tests; production passes `Math.random`.
 */
export function makeOrbs(count: number, dir: 1 | -1, random: () => number): Orb[] {
  const orbs: Orb[] = [];
  for (let i = 0; i < count; i++) {
    const size = (5 + random() * 11) * 0.4;
    const left = dir === 1 ? 8 + random() * 55 : 35 + random() * 55;
    const top = 10 + random() * 70;
    const dx = dir * (50 + random() * 110);
    const dy = -(15 + random() * 60);
    const duration = 750 + random() * 500;
    const delay = random() * 220;
    const role = (i % 3) as 0 | 1 | 2;
    orbs.push({ size, left, top, dx, dy, duration, delay, role });
  }
  return orbs;
}

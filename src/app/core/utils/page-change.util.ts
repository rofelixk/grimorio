// The shared page change's pure types (DESIGN.md Motion "Page sweep"): what an area supplies to
// `injectPageChange` (shared/effects/page-sweep/page-change.ts) and how a navigation marks itself.

export type SweepDir = 'open' | 'close';

/** What the page change records about the navigation that led to a place, at its `NavigationStart`. */
export interface PageNav {
  trigger: 'imperative' | 'popstate' | 'hashchange';
  info?: unknown;
}

/**
 * An area's pages: the place shown before the first navigation, when two places are the same page,
 * and which way a change between two different places sweeps (`null` for an instant swap). The
 * controller handles the first place, reduced motion and `NO_SWEEP_INFO` before asking `sweep`.
 */
export interface PageRule<P> {
  initial: P;
  same(a: P, b: P): boolean;
  sweep(from: P, to: P, nav: PageNav | null): SweepDir | null;
}

/** Navigation `info` asking for a sweep the area's rule would otherwise skip (the deck tile). */
export const SWEEP_INFO = { sweep: true } as const;

/** Navigation `info` for an instant swap whatever the rule says (redirects, delete landings). */
export const NO_SWEEP_INFO = { sweep: false } as const;

/** The navigation's `info.sweep`, when it set one. */
export function sweepInfo(nav: PageNav | null): boolean | undefined {
  const sweep = (nav?.info as { sweep?: unknown } | null | undefined)?.sweep;
  return typeof sweep === 'boolean' ? sweep : undefined;
}

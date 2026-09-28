// Which deck-area navigations turn the page (spec 009 FR-018, research R8). Pure, so the whole
// trigger table is unit-testable; `DeckTurn` feeds it what it captured at NavigationStart.

export type DeckPlace = { kind: 'list' } | { kind: 'deck'; id: string };

/** What `DeckTurn` records about the navigation that led to a place. */
export interface DeckNav {
  trigger: 'imperative' | 'popstate' | 'hashchange';
  info?: unknown;
  replaceUrl?: boolean;
}

export function samePlace(a: DeckPlace, b: DeckPlace): boolean {
  return a.kind === b.kind && (a.kind === 'list' || a.id === (b as { id: string }).id);
}

function deckTurnInfo(nav: DeckNav | null): boolean | undefined {
  return (nav?.info as { deckTurn?: boolean } | undefined)?.deckTurn;
}

/**
 * - list → deck turns open only when the deck tile asked for it (`info.deckTurn === true`), so
 *   browser forward, a typed address and the first load don't turn;
 * - deck → list turns closed unless it's the missing-deck redirect (`replaceUrl`) or the landing
 *   after a delete (`info.deckTurn === false`) — the back link, side nav and browser back all turn;
 * - the first place shown, the same place, and deck → another deck never turn.
 */
export function turnFor(from: DeckPlace | null, to: DeckPlace, nav: DeckNav | null): 'open' | 'close' | null {
  if (from === null || samePlace(from, to)) return null;
  if (from.kind === 'list' && to.kind === 'deck') {
    return deckTurnInfo(nav) === true ? 'open' : null;
  }
  if (from.kind === 'deck' && to.kind === 'list') {
    // The router marks every popstate navigation `replaceUrl`, so only an imperative one is the redirect.
    const redirect = nav?.trigger === 'imperative' && nav.replaceUrl === true;
    return redirect || deckTurnInfo(nav) === false ? null : 'close';
  }
  return null;
}

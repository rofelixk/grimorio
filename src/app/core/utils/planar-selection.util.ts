import type { PlanarCard } from '../data/planechase/planar-card.model';
import { DEFAULT_OFF_IDS } from '../data/planechase/default-off';
import type { PlanarSelection } from '@models/planar-selection.model';

/**
 * The cards in the planar deck: every catalog card except the saved selection's disabled ones,
 * or, with nothing saved, except the default-off list (spec 007 FR-017, FR-018).
 */
export function enabledCards(cards: readonly PlanarCard[], selection: PlanarSelection | null): PlanarCard[] {
  const disabled = new Set(initialDisabledIds(selection));
  return cards.filter((card) => !disabled.has(card.id));
}

/** The disabled ids in effect: the saved ones, or the default list when nothing is saved. */
export function initialDisabledIds(selection: PlanarSelection | null): string[] {
  return selection ? [...selection.disabledIds] : [...DEFAULT_OFF_IDS];
}

export type SelectionCheck =
  | { ok: true; notice: boolean }
  | { ok: false; error: 'tooFew'; count: number }
  | { ok: false; error: 'noPlane' };

/**
 * A selection needs 10 cards and a plane to save or start (FR-007, FR-019); `tooFew` wins over
 * `noPlane`. Under 40 cards or over 2 phenomena gets the shared-deck notice, which blocks nothing.
 */
export function validateSelection(enabled: readonly PlanarCard[]): SelectionCheck {
  if (enabled.length < 10) {
    return { ok: false, error: 'tooFew', count: enabled.length };
  }
  if (!enabled.some((card) => card.kind === 'plane')) {
    return { ok: false, error: 'noPlane' };
  }
  const phenomena = enabled.filter((card) => card.kind === 'phenomenon').length;
  return { ok: true, notice: enabled.length < 40 || phenomena > 2 };
}

/** Whether two id lists hold the same ids, in any order (FR-022's "changed selection"). */
export function sameEnabledSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((id) => set.has(id));
}

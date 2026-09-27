import type { PlanarResult, PlanechaseGame, PlanechaseGameState } from '@models/planechase-game.model';
import { RandomInt, rollPlanarDie, shuffle } from './crypto-random.util';

// The shared-deck Planechase game as pure transitions (data-model §3, R10). Every transition
// returns a new game; the undoable ones keep the previous state (without its own undo) as the
// one-step undo slot. A transition called where it isn't allowed throws: the service checks
// availableActions() first, so a throw is a bug.

export type CardKindOf = (id: string) => 'plane' | 'phenomenon';

export interface PlanechaseActions {
  roll: boolean;
  planeswalk: boolean;
  resetCost: boolean;
  confirm: boolean;
  reshuffle: boolean;
  undo: boolean;
}

function stateOf(game: PlanechaseGame): PlanechaseGameState {
  const { undo: _undo, ...state } = game;
  return state;
}

function undoable(next: PlanechaseGameState, previous: PlanechaseGame): PlanechaseGame {
  return { ...next, undo: stateOf(previous) };
}

function assertAllowed(allowed: boolean, action: string): void {
  if (!allowed) {
    throw new Error(`Planechase: ${action} isn't allowed in this state.`);
  }
}

/**
 * The shared draw: the face-up card goes to the end of `used` and the top of `drawOrder` turns up.
 * A phenomenon waits for confirmation; an empty draw order keeps the card and owes the planeswalk
 * until the reset (FR-013). Both override the action's own `result`.
 */
function draw(state: PlanechaseGameState, kindOf: CardKindOf, result: PlanarResult): PlanechaseGameState {
  if (state.drawOrder.length === 0) {
    return { ...state, pending: 'reset', result: { kind: 'allUsed' } };
  }
  const [next, ...rest] = state.drawOrder;
  const phenomenon = kindOf(next) === 'phenomenon';
  return {
    ...state,
    current: next,
    used: [...state.used, state.current],
    drawOrder: rest,
    pending: phenomenon ? 'phenomenon' : null,
    result: phenomenon ? { kind: 'phenomenon' } : result,
  };
}

/**
 * Shuffles the enabled cards; phenomena ahead of the first plane move, in order, to the bottom
 * (901.5), and that plane starts (FR-007). The caller has validated the list.
 */
export function startGame(enabledIds: string[], kindOf: CardKindOf, rnd: RandomInt): PlanechaseGame {
  const order = shuffle(enabledIds, rnd);
  const first = order.findIndex((id) => kindOf(id) === 'plane');
  assertAllowed(first >= 0, 'starting without a plane');
  return {
    list: [...enabledIds],
    current: order[first],
    used: [],
    drawOrder: [...order.slice(first + 1), ...order.slice(0, first)],
    cost: 0,
    pending: null,
    result: { kind: 'start' },
    undo: null,
  };
}

/** Rolls the planar die and raises the cost (FR-008, FR-009). */
export function roll(game: PlanechaseGame, kindOf: CardKindOf, rnd: RandomInt): PlanechaseGame {
  assertAllowed(game.pending === null, 'roll');
  const state = { ...stateOf(game), cost: game.cost + 1 };
  switch (rollPlanarDie(rnd)) {
    case 'planeswalk':
      return undoable(draw(state, kindOf, { kind: 'planeswalk', from: game.current }), game);
    case 'chaos':
      return undoable({ ...state, result: { kind: 'chaos' } }, game);
    case 'blank':
      return undoable({ ...state, result: { kind: 'blank' } }, game);
  }
}

/** The manual planeswalk: no die result, cost unchanged (FR-010). */
export function planeswalk(game: PlanechaseGame, kindOf: CardKindOf): PlanechaseGame {
  assertAllowed(game.pending === null, 'planeswalk');
  return undoable(draw(stateOf(game), kindOf, { kind: 'manual', from: game.current }), game);
}

/** The encounter is resolved: planeswalk again, possibly onto another phenomenon (312.7). */
export function confirmPhenomenon(game: PlanechaseGame, kindOf: CardKindOf): PlanechaseGame {
  assertAllowed(game.pending === 'phenomenon', 'confirmPhenomenon');
  const state: PlanechaseGameState = { ...stateOf(game), pending: null };
  return undoable(draw(state, kindOf, { kind: 'resolved', from: game.current }), game);
}

/** "Zerar custo" (FR-009). */
export function resetCost(game: PlanechaseGame): PlanechaseGame {
  assertAllowed(game.pending === null, 'resetCost');
  return undoable({ ...stateOf(game), cost: 0, result: { kind: 'cost' } }, game);
}

/**
 * "Reiniciar planos": every card but the current one goes back into a new draw order and `used`
 * empties. In the all-used state it also completes the owed planeswalk. Clears the undo slot.
 */
export function reshuffle(game: PlanechaseGame, kindOf: CardKindOf, rnd: RandomInt): PlanechaseGame {
  assertAllowed(game.pending !== 'phenomenon', 'reshuffle');
  const state: PlanechaseGameState = {
    ...stateOf(game),
    used: [],
    drawOrder: shuffle(
      game.list.filter((id) => id !== game.current),
      rnd,
    ),
  };
  const next =
    game.pending === 'reset'
      ? draw({ ...state, pending: null }, kindOf, { kind: 'reset', from: game.current })
      : { ...state, result: { kind: 'reset' } as const };
  return { ...next, undo: null };
}

/** "Desfazer": restores the state before the last undoable action exactly (FR-015a). */
export function undo(game: PlanechaseGame): PlanechaseGame {
  assertAllowed(game.undo !== null, 'undo');
  return { ...game.undo!, undo: null };
}

export function availableActions(game: PlanechaseGame): PlanechaseActions {
  const undo = game.undo !== null;
  switch (game.pending) {
    case 'phenomenon':
      return { roll: false, planeswalk: false, resetCost: false, confirm: true, reshuffle: false, undo };
    case 'reset':
      return { roll: false, planeswalk: false, resetCost: false, confirm: false, reshuffle: true, undo };
    case null:
      return { roll: true, planeswalk: true, resetCost: true, confirm: false, reshuffle: true, undo };
  }
}

/** The chaos or encounter plate is lit after a Caos result and while a phenomenon waits (FR-011). */
export function abilityLit(game: PlanechaseGame): boolean {
  return game.result.kind === 'chaos' || game.pending === 'phenomenon';
}

function referencesUnknown(result: PlanarResult, known: ReadonlySet<string>): boolean {
  return 'from' in result && result.from !== undefined && !known.has(result.from);
}

function repairState<T extends PlanechaseGameState>(state: T, known: ReadonlySet<string>): T {
  const keep = (ids: string[]) => ids.filter((id) => known.has(id));
  return {
    ...state,
    list: keep(state.list),
    used: keep(state.used),
    drawOrder: keep(state.drawOrder),
    // A result naming a removed card can't be shown; the table resumes from the face-up card.
    result: referencesUnknown(state.result, known) ? { kind: 'start' } : state.result,
  };
}

/**
 * Hydration repair after a card data update (R11): unknown ids leave every list and the undo
 * snapshot, and a snapshot whose face-up card is gone is discarded. If the face-up card itself is
 * gone, the game turns up the next card with no undo (or, with nothing to draw, the most recently
 * used one in the all-used state). An emptied list ends the game. An untouched game comes back as
 * the same object, so the caller can skip a write.
 */
export function repairGame(
  game: PlanechaseGame,
  known: ReadonlySet<string>,
  kindOf: CardKindOf,
): PlanechaseGame | null {
  const unchanged =
    game.list.every((id) => known.has(id)) &&
    known.has(game.current) &&
    !referencesUnknown(game.result, known) &&
    (game.undo === null ||
      (game.undo.list.every((id) => known.has(id)) &&
        known.has(game.undo.current) &&
        !referencesUnknown(game.undo.result, known)));
  if (unchanged) {
    return game;
  }

  const state = repairState(stateOf(game), known);
  if (state.list.length === 0) {
    return null;
  }
  if (known.has(game.current)) {
    const snapshot = game.undo && known.has(game.undo.current) ? repairState(game.undo, known) : null;
    return { ...state, undo: snapshot };
  }

  if (state.drawOrder.length > 0) {
    const [next, ...rest] = state.drawOrder;
    const phenomenon = kindOf(next) === 'phenomenon';
    return {
      ...state,
      current: next,
      drawOrder: rest,
      pending: phenomenon ? 'phenomenon' : null,
      result: phenomenon ? { kind: 'phenomenon' } : { kind: 'start' },
      undo: null,
    };
  }
  const current = state.used[state.used.length - 1];
  return {
    ...state,
    current,
    used: state.used.slice(0, -1),
    pending: 'reset',
    result: { kind: 'allUsed' },
    undo: null,
  };
}

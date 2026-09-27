/**
 * What the last action showed (data-model §3). `from` is the id of the card that just went to the
 * used list; the view shows its name. The starting plane is `current`, so `start` carries nothing.
 */
export type PlanarResult =
  | { kind: 'start' }
  | { kind: 'blank' }
  /** `manual`: set with the Caos button for a physical die; the cost doesn't change. */
  | { kind: 'chaos'; manual?: true }
  | { kind: 'planeswalk'; from: string }
  | { kind: 'manual'; from: string }
  | { kind: 'cost' }
  | { kind: 'phenomenon' }
  | { kind: 'resolved'; from: string }
  /** `from` is set when the reset completed a pending planeswalk. */
  | { kind: 'reset'; from?: string }
  | { kind: 'allUsed' };

export interface PlanechaseGameState {
  /** Card ids fixed at start (FR-007, FR-022). */
  list: string[];
  /** The face-up card. */
  current: string;
  /** Visit order; never shown (FR-012). */
  used: string[];
  /** Face-down order; index 0 is the top (FR-008a). */
  drawOrder: string[];
  /** The next roll's cost, ≥ 0 (FR-009). */
  cost: number;
  /** A phenomenon awaiting confirmation, or a planeswalk blocked until the reset (FR-013). */
  pending: 'phenomenon' | 'reset' | null;
  result: PlanarResult;
}

/** The game in progress, persisted on the device with its one-step undo (FR-015, FR-015a). */
export interface PlanechaseGame extends PlanechaseGameState {
  undo: PlanechaseGameState | null;
}

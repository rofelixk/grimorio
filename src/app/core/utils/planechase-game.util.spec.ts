import { describe, expect, it } from 'vitest';
import type { PlanechaseGame, PlanechaseGameState } from '@models/planechase-game.model';
import { PLANAR_RECORDS, planarKindOf as kindOf, scriptedRandom } from '@testing/planechase-fixtures';
import { randomInt } from './crypto-random.util';
import {
  abilityLit,
  chaos,
  availableActions,
  confirmPhenomenon,
  planeswalk,
  repairGame,
  reshuffle,
  resetCost,
  roll,
  startGame,
  undo,
} from './planechase-game.util';

const ALL_IDS = PLANAR_RECORDS.map((card) => card.id);

function game(partial: Partial<PlanechaseGame> = {}): PlanechaseGame {
  return {
    list: ['p01', 'p02', 'p03', 'f01'],
    current: 'p01',
    used: [],
    drawOrder: ['p02', 'f01', 'p03'],
    cost: 0,
    pending: null,
    result: { kind: 'start' },
    undo: null,
    ...partial,
  };
}

function stateOf(g: PlanechaseGame): PlanechaseGameState {
  const { list, current, used, drawOrder, cost, pending, result } = g;
  return { list, current, used, drawOrder, cost, pending, result };
}

/** current, used and drawOrder are pairwise distinct and together make up the list. */
function expectPartition(g: PlanechaseGameState): void {
  const all = [g.current, ...g.used, ...g.drawOrder];
  expect(new Set(all).size).toBe(all.length);
  expect([...all].sort()).toEqual([...g.list].sort());
  if (g.pending === 'phenomenon') {
    expect(kindOf(g.current)).toBe('phenomenon');
  }
  if (g.pending === 'reset') {
    expect(g.drawOrder).toEqual([]);
  }
}

/** One planeswalk, or the confirmation a face-up phenomenon is waiting on. */
function step(g: PlanechaseGame): PlanechaseGame {
  return g.pending === 'phenomenon' ? confirmPhenomenon(g, kindOf) : planeswalk(g, kindOf);
}

/** Planeswalks (confirming phenomena) until the all-used state; returns every card turned up. */
function walkUntilAllUsed(start: PlanechaseGame): { end: PlanechaseGame; seen: string[] } {
  let g = start;
  const seen: string[] = [];
  for (;;) {
    g = step(g);
    if (g.pending === 'reset') {
      return { end: g, seen };
    }
    seen.push(g.current);
  }
}

describe('startGame', () => {
  it('moves phenomena ahead of the first plane, in order, to the bottom (901.5)', () => {
    // j = i at every Fisher–Yates step keeps the input order: [f01, f02, p01, p02].
    const g = startGame(['f01', 'f02', 'p01', 'p02'], kindOf, scriptedRandom([3, 2, 1]));
    expect(g).toEqual({
      list: ['f01', 'f02', 'p01', 'p02'],
      current: 'p01',
      used: [],
      drawOrder: ['p02', 'f01', 'f02'],
      cost: 0,
      pending: null,
      result: { kind: 'start' },
      undo: null,
    });
    expect(availableActions(g).undo).toBe(false);
  });

  it('throws without a plane', () => {
    expect(() => startGame(['f01', 'f02'], kindOf, randomInt)).toThrow();
  });
});

describe('roll', () => {
  it('face 1 planeswalks, raises the cost and keeps the previous state for undo', () => {
    const before = game({ cost: 2 });
    const g = roll(before, kindOf, scriptedRandom([0]));
    expect(g.current).toBe('p02');
    expect(g.used).toEqual(['p01']);
    expect(g.drawOrder).toEqual(['f01', 'p03']);
    expect(g.cost).toBe(3);
    expect(g.result).toEqual({ kind: 'planeswalk', from: 'p01' });
    expect(g.undo).toEqual(stateOf(before));
  });

  it('face 6 is chaos: same plane, plate lit', () => {
    const g = roll(game(), kindOf, scriptedRandom([5]));
    expect(g.current).toBe('p01');
    expect(g.result).toEqual({ kind: 'chaos' });
    expect(g.cost).toBe(1);
    expect(abilityLit(g)).toBe(true);
  });

  it('faces 2–5 are blank', () => {
    const g = roll(game(), kindOf, scriptedRandom([2]));
    expect(g.result).toEqual({ kind: 'blank' });
    expect(g.current).toBe('p01');
    expect(abilityLit(g)).toBe(false);
  });

  it('a planeswalk onto a phenomenon leaves it pending', () => {
    const g = roll(game({ drawOrder: ['f01', 'p02', 'p03'] }), kindOf, scriptedRandom([0]));
    expect(g.current).toBe('f01');
    expect(g.pending).toBe('phenomenon');
    expect(g.result).toEqual({ kind: 'phenomenon' });
    expect(abilityLit(g)).toBe(true);
  });
});

describe('planeswalk (manual)', () => {
  it('draws without changing the cost or showing a die result', () => {
    const g = planeswalk(game({ cost: 3 }), kindOf);
    expect(g.cost).toBe(3);
    expect(g.current).toBe('p02');
    expect(g.result).toEqual({ kind: 'manual', from: 'p01' });
    expect(g.undo).not.toBeNull();
  });
});

describe('phenomena', () => {
  it('chains back-to-back phenomena, then lands on a plane as "resolved"', () => {
    let g = planeswalk(
      game({ list: ['p01', 'f01', 'f02', 'p02'], drawOrder: ['f01', 'f02', 'p02'] }),
      kindOf,
    );
    expect(g.pending).toBe('phenomenon');
    expect(availableActions(g)).toEqual({
      roll: false,
      planeswalk: false,
      chaos: false,
      resetCost: false,
      confirm: true,
      reshuffle: false,
      undo: true,
    });

    g = confirmPhenomenon(g, kindOf);
    expect(g.current).toBe('f02');
    expect(g.pending).toBe('phenomenon');
    expect(g.result).toEqual({ kind: 'phenomenon' });

    g = confirmPhenomenon(g, kindOf);
    expect(g.current).toBe('p02');
    expect(g.pending).toBeNull();
    expect(g.result).toEqual({ kind: 'resolved', from: 'f02' });
    expect(g.used).toEqual(['p01', 'f01', 'f02']);
  });

  it('confirming with nothing left to draw owes the planeswalk (all used)', () => {
    const g = confirmPhenomenon(
      game({ list: ['p01', 'f01'], current: 'f01', used: ['p01'], drawOrder: [], pending: 'phenomenon' }),
      kindOf,
    );
    expect(g.pending).toBe('reset');
    expect(g.current).toBe('f01');
    expect(g.used).toEqual(['p01']);
    expect(g.result).toEqual({ kind: 'allUsed' });
    expect(availableActions(g)).toEqual({
      roll: false,
      planeswalk: false,
      chaos: false,
      resetCost: false,
      confirm: false,
      reshuffle: true,
      undo: true,
    });
  });
});

describe('reshuffle', () => {
  it('in the all-used state, refills the draw order and completes the planeswalk', () => {
    const allUsed = game({ current: 'p03', used: ['p01', 'p02', 'f01'], drawOrder: [], pending: 'reset', result: { kind: 'allUsed' } });
    // shuffle([p01, p02, f01]) with j = i keeps the order.
    const g = reshuffle(allUsed, kindOf, scriptedRandom([2, 1]));
    expect(g.current).toBe('p01');
    expect(g.used).toEqual(['p03']);
    expect(g.drawOrder).toEqual(['p02', 'f01']);
    expect(g.pending).toBeNull();
    expect(g.result).toEqual({ kind: 'reset', from: 'p03' });
    expect(g.undo).toBeNull();
  });

  it('anytime: every card but the current one returns, without a planeswalk', () => {
    const g = reshuffle(game({ current: 'p02', used: ['p01'], drawOrder: ['f01', 'p03'], undo: stateOf(game()) }), kindOf, randomInt);
    expect(g.current).toBe('p02');
    expect(g.used).toEqual([]);
    expect([...g.drawOrder].sort()).toEqual(['f01', 'p01', 'p03']);
    expect(g.result).toEqual({ kind: 'reset' });
    expect(g.undo).toBeNull();
    expectPartition(g);
  });
});

describe('resetCost', () => {
  it('sets the cost to 0 and can be undone', () => {
    const before = game({ cost: 4 });
    const g = resetCost(before);
    expect(g.cost).toBe(0);
    expect(g.result).toEqual({ kind: 'cost' });
    expect(undo(g)).toEqual({ ...before, undo: null });
  });
});

describe('undo', () => {
  it('restores every field, the draw order included, and empties the slot', () => {
    const before = roll(game(), kindOf, scriptedRandom([3]));
    const after = roll(before, kindOf, scriptedRandom([0]));
    const restored = undo(after);
    expect(restored).toEqual({ ...stateOf(before), undo: null });
    expect(availableActions(restored).undo).toBe(false);
    expect(() => undo(restored)).toThrow();
  });

  it('is unavailable after start and after a reshuffle', () => {
    expect(availableActions(startGame(ALL_IDS, kindOf, randomInt)).undo).toBe(false);
    expect(availableActions(reshuffle(planeswalk(game(), kindOf), kindOf, randomInt)).undo).toBe(false);
  });
});

describe('disallowed transitions throw', () => {
  const phenomenon = game({ current: 'f01', used: ['p01'], drawOrder: ['p02', 'p03'], pending: 'phenomenon' });
  const allUsed = game({ current: 'p03', used: ['p01', 'p02', 'f01'], drawOrder: [], pending: 'reset' });

  it('while a phenomenon waits', () => {
    expect(() => roll(phenomenon, kindOf, randomInt)).toThrow();
    expect(() => planeswalk(phenomenon, kindOf)).toThrow();
    expect(() => resetCost(phenomenon)).toThrow();
    expect(() => reshuffle(phenomenon, kindOf, randomInt)).toThrow();
  });

  it('while all cards are used', () => {
    expect(() => roll(allUsed, kindOf, randomInt)).toThrow();
    expect(() => planeswalk(allUsed, kindOf)).toThrow();
    expect(() => resetCost(allUsed)).toThrow();
    expect(() => confirmPhenomenon(allUsed, kindOf)).toThrow();
  });

  it('confirming with no phenomenon', () => {
    expect(() => confirmPhenomenon(game(), kindOf)).toThrow();
  });
});

describe('availableActions', () => {
  it('offers everything but confirm with nothing pending', () => {
    expect(availableActions(game())).toEqual({
      roll: true,
      planeswalk: true,
      chaos: true,
      resetCost: true,
      confirm: false,
      reshuffle: true,
      undo: false,
    });
  });
});

describe('chaos (manual, physical die)', () => {
  it('gives the Caos result and lights the plate, leaving the card and the cost alone', () => {
    const before = game({ cost: 2 });
    const g = chaos(before);
    expect(g.result).toEqual({ kind: 'chaos', manual: true });
    expect(g.current).toBe(before.current);
    expect(g.cost).toBe(2);
    expect(g.drawOrder).toEqual(before.drawOrder);
    expect(abilityLit(g)).toBe(true);
  });

  it('is undoable', () => {
    const before = game({ cost: 2 });
    expect(undo(chaos(before))).toEqual({ ...before, undo: null });
  });

  it('is refused while a phenomenon waits or the planes are all used', () => {
    expect(() => chaos(game({ pending: 'phenomenon' }))).toThrow();
    expect(() => chaos(game({ pending: 'reset' }))).toThrow();
  });
});

describe('invariants', () => {
  it('hold across a long random session', () => {
    let g = startGame(ALL_IDS, kindOf, randomInt);
    expectPartition(g);
    for (let step = 0; step < 1000; step++) {
      const actions = availableActions(g);
      const options = [
        actions.roll && (() => roll(g, kindOf, randomInt)),
        actions.planeswalk && (() => planeswalk(g, kindOf)),
        actions.confirm && (() => confirmPhenomenon(g, kindOf)),
        actions.resetCost && (() => resetCost(g)),
        actions.reshuffle && step % 17 === 0 && (() => reshuffle(g, kindOf, randomInt)),
        actions.reshuffle && g.pending === 'reset' && (() => reshuffle(g, kindOf, randomInt)),
        actions.undo && step % 5 === 0 && (() => undo(g)),
      ].filter((option): option is () => PlanechaseGame => !!option);
      g = options[randomInt(options.length)]();
      expectPartition(g);
      if (g.undo) {
        expectPartition(g.undo);
      }
    }
  });
});

describe('SC-004', () => {
  it('the N−1 planeswalks after the start never repeat a card or the starting plane', () => {
    for (let run = 0; run < 25; run++) {
      const start = startGame(ALL_IDS, kindOf, randomInt);
      const { seen } = walkUntilAllUsed(start);
      expect(seen).toHaveLength(ALL_IDS.length - 1);
      expect(new Set([start.current, ...seen]).size).toBe(ALL_IDS.length);
    }
  });

  it('after the all-used reset, the next N−1 planeswalks show every card but the kept one exactly once', () => {
    for (let run = 0; run < 25; run++) {
      const { end } = walkUntilAllUsed(startGame(ALL_IDS, kindOf, randomInt));
      const kept = end.current;
      let g = reshuffle(end, kindOf, randomInt);
      const seen = [g.current];
      const rest = walkUntilAllUsed(g);
      seen.push(...rest.seen);
      g = rest.end;
      expect([...seen].sort()).toEqual(ALL_IDS.filter((id) => id !== kept).sort());
      expect(g.pending).toBe('reset');
    }
  });

  it('after an anytime reset, the next N−1 planeswalks show every card but the current one exactly once', () => {
    for (let run = 0; run < 25; run++) {
      // Two draws in, stepping through any phenomenon either one turns up.
      let g = step(step(startGame(ALL_IDS, kindOf, randomInt)));
      while (g.pending === 'phenomenon') {
        g = confirmPhenomenon(g, kindOf);
      }
      g = reshuffle(g, kindOf, randomInt);
      const { seen } = walkUntilAllUsed(g);
      expect([...seen].sort()).toEqual(ALL_IDS.filter((id) => id !== g.current).sort());
    }
  });
});

describe('repairGame', () => {
  const known = (ids: string[]) => new Set(ids);

  it('returns the same game when every id is still known', () => {
    const g = planeswalk(game(), kindOf);
    expect(repairGame(g, known(ALL_IDS), kindOf)).toBe(g);
  });

  it('drops unknown ids from every list and from the undo snapshot', () => {
    const g = planeswalk(game({ list: ['p01', 'p02', 'p03', 'p04'], drawOrder: ['p02', 'p03', 'p04'] }), kindOf);
    const repaired = repairGame(g, known(['p01', 'p02', 'p04']), kindOf)!;
    expect(repaired.list).toEqual(['p01', 'p02', 'p04']);
    expect(repaired.drawOrder).toEqual(['p04']);
    expect(repaired.undo!.drawOrder).toEqual(['p02', 'p04']);
    expectPartition(repaired);
  });

  it('discards a snapshot whose face-up card is gone', () => {
    const g = planeswalk(game(), kindOf); // undo.current = p01
    const repaired = repairGame(g, known(['p02', 'p03', 'f01']), kindOf)!;
    expect(repaired.current).toBe('p02');
    expect(repaired.undo).toBeNull();
    expect(repaired.used).toEqual([]);
    // The result named the removed card, so it resumes as the face-up plane.
    expect(repaired.result).toEqual({ kind: 'start' });
  });

  it('turns up the next card, with no undo, when the face-up card is gone', () => {
    const g = planeswalk(game(), kindOf); // current p02, drawOrder [f01, p03]
    const repaired = repairGame(g, known(['p01', 'p03', 'f01']), kindOf)!;
    expect(repaired.current).toBe('f01');
    expect(repaired.pending).toBe('phenomenon');
    expect(repaired.undo).toBeNull();
    expectPartition(repaired);
  });

  it('falls back to the all-used state when nothing is left to draw', () => {
    const g = game({ current: 'p03', used: ['p01', 'p02'], drawOrder: [], list: ['p01', 'p02', 'p03'] });
    const repaired = repairGame(g, known(['p01', 'p02']), kindOf)!;
    expect(repaired.current).toBe('p02');
    expect(repaired.used).toEqual(['p01']);
    expect(repaired.pending).toBe('reset');
    expect(repaired.result).toEqual({ kind: 'allUsed' });
    expectPartition(repaired);
  });

  it('ends the game when no card is left', () => {
    expect(repairGame(game(), known(['p99']), kindOf)).toBeNull();
  });
});

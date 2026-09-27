/** A uniform integer in `[0, n)`. Game code takes one of these so tests can script it. */
export type RandomInt = (n: number) => number;

/** Fills a one-slot buffer with random bits, like `crypto.getRandomValues`. */
export type RandomSource = (array: Uint32Array<ArrayBuffer>) => Uint32Array<ArrayBuffer>;

const RANGE = 2 ** 32;

function cryptoSource(array: Uint32Array<ArrayBuffer>): Uint32Array<ArrayBuffer> {
  return crypto.getRandomValues(array);
}

/**
 * A uniform integer in `[0, n)` from `crypto.getRandomValues`, by rejection sampling over Uint32
 * so there's no modulo bias (FR-008a, R9).
 */
export function randomInt(n: number, source: RandomSource = cryptoSource): number {
  if (!Number.isInteger(n) || n < 1 || n > RANGE) {
    throw new RangeError(`randomInt: n must be an integer in [1, 2^32], got ${n}.`);
  }
  const limit = RANGE - (RANGE % n);
  const buffer = new Uint32Array(1);
  for (;;) {
    const value = source(buffer)[0];
    if (value < limit) {
      return value % n;
    }
  }
}

/** Fisher–Yates on a copy; the input is never mutated. */
export function shuffle<T>(items: readonly T[], rnd: RandomInt): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export type DieFace = 'planeswalk' | 'chaos' | 'blank';

/** The planar die: 1 → Planeswalk, 6 → Caos, 2–5 → blank (FR-008). */
export function rollPlanarDie(rnd: RandomInt): DieFace {
  const face = rnd(6) + 1;
  return face === 1 ? 'planeswalk' : face === 6 ? 'chaos' : 'blank';
}

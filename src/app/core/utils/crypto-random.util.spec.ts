import { describe, expect, it } from 'vitest';
import { scriptedRandom } from '@testing/planechase-fixtures';
import { RandomSource, randomInt, rollPlanarDie, shuffle } from './crypto-random.util';

/** A Uint32 source returning `values` in order. */
function source(values: number[]): RandomSource {
  let index = 0;
  return (array) => {
    array[0] = values[index++];
    return array;
  };
}

describe('randomInt', () => {
  it('redraws a value at or above the rejection limit instead of folding it', () => {
    // n = 6: limit = 2^32 − (2^32 % 6) = 4294967292. 4294967295 would bias toward 3.
    expect(randomInt(6, source([4294967295, 4294967292, 13]))).toBe(1);
  });

  it('accepts the largest value below the limit', () => {
    expect(randomInt(6, source([4294967291]))).toBe(4294967291 % 6);
  });

  it('stays in [0, n) with the real source', () => {
    for (const n of [1, 2, 6, 7, 161]) {
      for (let i = 0; i < 200; i++) {
        const value = randomInt(n);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(n);
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });

  it('rejects a non-positive or fractional n', () => {
    expect(() => randomInt(0)).toThrow(RangeError);
    expect(() => randomInt(2.5)).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating its input', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = shuffle(items, randomInt);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect([...result].sort()).toEqual(items);
  });

  it('is Fisher–Yates: swaps index i with rnd(i + 1), from the end', () => {
    // i=3 ↔ 0, i=2 ↔ 2, i=1 ↔ 0: [a,b,c,d] → [d,b,c,a] → [d,b,c,a] → [b,d,c,a]
    expect(shuffle(['a', 'b', 'c', 'd'], scriptedRandom([0, 2, 0]))).toEqual(['b', 'd', 'c', 'a']);
  });

  it('handles empty and single-item lists', () => {
    expect(shuffle([], randomInt)).toEqual([]);
    expect(shuffle(['x'], randomInt)).toEqual(['x']);
  });
});

describe('rollPlanarDie', () => {
  it('maps face 1 to planeswalk, face 6 to chaos and 2–5 to blank', () => {
    expect(rollPlanarDie(scriptedRandom([0]))).toBe('planeswalk');
    expect(rollPlanarDie(scriptedRandom([5]))).toBe('chaos');
    for (const value of [1, 2, 3, 4]) {
      expect(rollPlanarDie(scriptedRandom([value]))).toBe('blank');
    }
  });

  it('SC-003: over 6,000 real rolls each result is within ±2 points of its expected share', () => {
    const rolls = 6000;
    const counts = { planeswalk: 0, chaos: 0, blank: 0 };
    for (let i = 0; i < rolls; i++) {
      counts[rollPlanarDie(randomInt)]++;
    }
    expect(Math.abs(counts.planeswalk / rolls - 1 / 6)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(counts.chaos / rolls - 1 / 6)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(counts.blank / rolls - 4 / 6)).toBeLessThanOrEqual(0.02);
  });
});

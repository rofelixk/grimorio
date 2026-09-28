import { describe, expect, it } from 'vitest';
import { type Speck, easeStandard, edgeX, makeSpecks, settleSchedule, settledAlpha, stepSpeck } from './deck-dust.util';

/** A deterministic mulberry32. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function speck(overrides: Partial<Speck> = {}): Speck {
  return { ...makeSpecks(1, 300, 300, ['#f2ede8'], seeded(1))[0], ...overrides };
}

describe('deck dust', () => {
  it('makes specks with the handoff radius range and cycling colors', () => {
    const specks = makeSpecks(6, 300, 400, ['a', 'b'], seeded(7));
    expect(specks.map((s) => s.color)).toEqual(['a', 'b', 'a', 'b', 'a', 'b']);
    for (const s of specks) {
      expect(s.r).toBeGreaterThanOrEqual(0.45);
      expect(s.r).toBeLessThanOrEqual(1.55);
      expect(s.jitter).toBeGreaterThanOrEqual(0.6);
      expect(s.jitter).toBeLessThanOrEqual(1.4);
    }
  });

  it('eases from 0 to 1 along the standard curve', () => {
    expect(easeStandard(0)).toBeCloseTo(0);
    expect(easeStandard(1)).toBeCloseTo(1);
    expect(easeStandard(0.5)).toBeGreaterThan(0.5);
  });

  it('puts the edge at the right side when flat and at the spine when turned over', () => {
    expect(edgeX(0, 300, 2800, 0)).toBeCloseTo(300);
    expect(edgeX(-Math.PI, 300, 2800, 0)).toBeCloseTo(-300);
    expect(edgeX(0, 300, 2800, 24)).toBeCloseTo(324);
  });

  it('keeps a speck far from the edge at alpha 0', () => {
    const s = speck({ x: 20, y: 100 });
    for (let t = 0; t < 30; t++) {
      stepSpeck(s, { t: t * 16, edgeX: 290, vex: -20, width: 300, turning: true });
    }
    expect(s.a).toBe(0);
  });

  it('gives a speck at the edge alpha while turning', () => {
    const s = speck({ x: 150, y: 100 });
    stepSpeck(s, { t: 0, edgeX: 150, vex: -20, width: 300, turning: true });
    expect(s.a).toBeGreaterThan(0);
  });

  it('fades every speck out by 2000 ms after settling, at different times', () => {
    const random = seeded(42);
    const specks = makeSpecks(50, 300, 300, ['#f2ede8'], random).map((s) => ({ ...s, a: 1 }));
    settleSchedule(specks, random);

    expect(specks.every((s) => settledAlpha(s, 2000) === 0)).toBe(true);
    const ends = new Set(specks.map((s) => Math.round(s.fadeDelay + s.fadeMs)));
    expect(ends.size).toBeGreaterThan(1);
    expect(specks.some((s) => settledAlpha(s, 700) > 0)).toBe(true);
  });
});

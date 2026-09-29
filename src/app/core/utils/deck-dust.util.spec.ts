import { describe, expect, it } from 'vitest';
import {
  FRONT_BAND,
  SETTLE_MAX_MS,
  type Speck,
  dustColors,
  frontX,
  makeSpecks,
  settleSchedule,
  settledAlpha,
  stepSpeck,
} from './deck-dust.util';
import { IDENTITY_HEX } from './identity.util';

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
      expect(s.r).toBeGreaterThanOrEqual(0.25);
      expect(s.r).toBeLessThanOrEqual(1.35);
      expect(s.jitter).toBeGreaterThanOrEqual(0.6);
      expect(s.jitter).toBeLessThanOrEqual(1.4);
    }
  });

  it('colors the dust with the identity hexes, in order', () => {
    expect(dustColors(['U', 'G'])).toEqual([IDENTITY_HEX.U.base, IDENTITY_HEX.G.base]);
  });

  it('sweeps the front right → left to open, from the right side to one band past the left', () => {
    expect(frontX(0, 1200, 'open')).toBe(1200);
    expect(frontX(0.5, 1200, 'open')).toBeCloseTo(1200 - (1200 + FRONT_BAND) / 2);
    expect(frontX(1, 1200, 'open')).toBe(-FRONT_BAND);
  });

  it('mirrors the front to close, from the left side to one band past the right', () => {
    expect(frontX(0, 1200, 'close')).toBe(0);
    expect(frontX(0.5, 1200, 'close')).toBeCloseTo((1200 + FRONT_BAND) / 2);
    expect(frontX(1, 1200, 'close')).toBe(1200 + FRONT_BAND);
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

  it('fades every speck out within the settle window after settling, at different times', () => {
    const random = seeded(42);
    const specks = makeSpecks(50, 300, 300, ['#f2ede8'], random).map((s) => ({ ...s, a: 1 }));
    settleSchedule(specks, random);

    expect(specks.every((s) => settledAlpha(s, SETTLE_MAX_MS) === 0)).toBe(true);
    const ends = new Set(specks.map((s) => Math.round(s.fadeDelay + s.fadeMs)));
    expect(ends.size).toBeGreaterThan(1);
    expect(specks.some((s) => settledAlpha(s, SETTLE_MAX_MS / 2) > 0)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { ORB_COUNT, makeOrbs, transitionDir, type Place } from './collection-transition.util';

/** A deterministic sequence over [0, 1), cycling through values that hit every boundary. */
function seeded(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('transitionDir', () => {
  const depthOf = (id: string) => ({ root: 1, child: 2, grand: 3 }[id] ?? 0);
  const list: Place = { kind: 'list' };
  const holding: Place = { kind: 'holding' };
  const root: Place = { kind: 'collection', id: 'root' };
  const child: Place = { kind: 'collection', id: 'child' };
  const grand: Place = { kind: 'collection', id: 'grand' };
  const sibling: Place = { kind: 'collection', id: 'root' };

  it('is +1 from the list into a top-level collection', () => {
    expect(transitionDir(list, root, depthOf)).toBe(1);
  });

  it('is +1 going from a collection into its child', () => {
    expect(transitionDir(root, child, depthOf)).toBe(1);
  });

  it('is -1 going from a child back to its parent', () => {
    expect(transitionDir(child, root, depthOf)).toBe(-1);
  });

  it('is -1 from the holding box back to the list', () => {
    expect(transitionDir(holding, list, depthOf)).toBe(-1);
  });

  it('is +1 from the list into the holding box', () => {
    expect(transitionDir(list, holding, depthOf)).toBe(1);
  });

  it('is +1 between siblings at the same depth', () => {
    expect(transitionDir(root, sibling, depthOf)).toBe(1);
  });

  it('is -1 unwinding three levels to the root', () => {
    expect(transitionDir(grand, root, depthOf)).toBe(-1);
  });
});

describe('makeOrbs', () => {
  it('returns the requested count, with role cycling 0/1/2', () => {
    const orbs = makeOrbs(ORB_COUNT, 1, seeded([0]));
    expect(orbs).toHaveLength(ORB_COUNT);
    expect(orbs.map((o) => o.role)).toEqual(Array.from({ length: ORB_COUNT }, (_, i) => i % 3));
  });

  it('keeps every field inside its documented range at r=0', () => {
    const [orb] = makeOrbs(1, 1, seeded([0]));
    expect(orb.size).toBeCloseTo(2, 5);
    expect(orb.left).toBeCloseTo(8, 5);
    expect(orb.top).toBeCloseTo(10, 5);
    expect(orb.dx).toBeCloseTo(50, 5);
    expect(orb.dy).toBeCloseTo(-15, 5);
    expect(orb.duration).toBeCloseTo(750, 5);
    expect(orb.delay).toBeCloseTo(0, 5);
  });

  it('keeps every field inside its documented range at r just under 1', () => {
    const r = 0.999999;
    const [orb] = makeOrbs(1, 1, seeded([r]));
    expect(orb.size).toBeLessThan(6.4 + 1e-6);
    expect(orb.left).toBeLessThan(63 + 1e-6);
    expect(orb.top).toBeLessThan(80 + 1e-6);
    expect(orb.dx).toBeLessThan(160 + 1e-6);
    expect(orb.dy).toBeGreaterThan(-75 - 1e-6);
    expect(orb.duration).toBeLessThan(1250 + 1e-6);
    expect(orb.delay).toBeLessThan(220 + 1e-6);
  });

  it('starts left in 35-90% and dx negative when going up (dir -1)', () => {
    const [low] = makeOrbs(1, -1, seeded([0]));
    expect(low.left).toBeCloseTo(35, 5);
    expect(low.dx).toBeCloseTo(-50, 5);

    const [high] = makeOrbs(1, -1, seeded([0.999999]));
    expect(high.left).toBeLessThan(90 + 1e-6);
    expect(high.dx).toBeGreaterThan(-160 - 1e-6);
    expect(high.dx).toBeLessThan(0);
  });

  it('keeps every orb dx sign equal to dir', () => {
    for (const dir of [1, -1] as const) {
      const orbs = makeOrbs(ORB_COUNT, dir, seeded([0.1, 0.4, 0.7, 0.2, 0.9]));
      for (const orb of orbs) {
        expect(Math.sign(orb.dx)).toBe(dir);
      }
    }
  });
});

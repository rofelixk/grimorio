import { describe, expect, it } from 'vitest';
import { transitionDir, type Place } from './collection-transition.util';

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

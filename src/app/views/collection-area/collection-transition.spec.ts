import { TestBed } from '@angular/core/testing';
import { ORB_COUNT, type Place } from '@utils/collection-transition.util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionTransition } from './collection-transition';

const list: Place = { kind: 'list' };
const top: Place = { kind: 'collection', id: 'a' };
const child: Place = { kind: 'collection', id: 'b' };
const depthOf = (id: string) => (id === 'a' ? 1 : id === 'b' ? 2 : 0);
const measure = { outer: () => 300, inner: () => 180 };

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduce'),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function create(): CollectionTransition {
  TestBed.configureTestingModule({ providers: [CollectionTransition] });
  return TestBed.inject(CollectionTransition);
}

describe('CollectionTransition', () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the first place at once, with no lock and no orbs', () => {
    stubReducedMotion(false);
    const transition = create();
    transition.go(top, depthOf, measure);
    expect(transition.shown()).toEqual(top);
    expect(transition.phase()).toBe('idle');
    expect(transition.lockHeight()).toBeNull();
    expect(transition.orbs()).toEqual([]);
  });

  it('runs out → swap → in → release, then clears the orbs', () => {
    stubReducedMotion(false);
    const transition = create();
    transition.go(list, depthOf, measure);

    transition.go(top, depthOf, measure);
    expect(transition.phase()).toBe('out');
    expect(transition.dir()).toBe(1);
    expect(transition.lockHeight()).toBe(300);
    expect(transition.orbs()).toHaveLength(ORB_COUNT);
    expect(transition.shown()).toEqual(list);

    vi.advanceTimersByTime(139);
    expect(transition.shown()).toEqual(list);
    vi.advanceTimersByTime(1);
    expect(transition.shown()).toEqual(top);
    expect(transition.phase()).toBe('in');
    expect(transition.entering()).toBe(true);

    vi.advanceTimersToNextFrame();
    vi.advanceTimersToNextFrame();
    expect(transition.entering()).toBe(false);
    expect(transition.lockHeight()).toBe(180);

    // Released ~280ms after the swap (420ms from go()).
    vi.advanceTimersByTime(300);
    expect(transition.lockHeight()).toBeNull();
    expect(transition.phase()).toBe('idle');
    expect(transition.orbs()).toHaveLength(ORB_COUNT);

    vi.advanceTimersByTime(1500);
    expect(transition.orbs()).toEqual([]);
  });

  it('eases the height over 480ms on phone, releasing after it', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('max-width: 640px'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const transition = create();
    expect(transition.heightMs()).toBe(480);
    transition.go(list, depthOf, measure);
    transition.go(top, depthOf, measure);

    vi.advanceTimersByTime(140 + 480 + 39);
    expect(transition.lockHeight()).toBe(180);
    vi.advanceTimersByTime(1);
    expect(transition.lockHeight()).toBeNull();
  });

  it('goes up with dir −1', () => {
    stubReducedMotion(false);
    const transition = create();
    transition.go(child, depthOf, measure);
    transition.go(top, depthOf, measure);
    expect(transition.dir()).toBe(-1);
  });

  it('jumps to the latest target when go() is called during a run', () => {
    stubReducedMotion(false);
    const transition = create();
    transition.go(list, depthOf, measure);
    transition.go(top, depthOf, measure);
    vi.advanceTimersByTime(60);
    transition.go(child, depthOf, measure);

    vi.advanceTimersByTime(140);
    expect(transition.shown()).toEqual(child);
    vi.advanceTimersByTime(2000);
    expect(transition.shown()).toEqual(child);
    expect(transition.phase()).toBe('idle');
    expect(transition.lockHeight()).toBeNull();
  });

  it('swaps instantly under reduced motion', () => {
    stubReducedMotion(true);
    const transition = create();
    transition.go(list, depthOf, measure);
    transition.go(top, depthOf, measure);
    expect(transition.shown()).toEqual(top);
    expect(transition.phase()).toBe('idle');
    expect(transition.lockHeight()).toBeNull();
    expect(transition.orbs()).toEqual([]);
  });
});

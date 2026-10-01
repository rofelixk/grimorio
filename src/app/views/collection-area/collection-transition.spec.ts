import { TestBed } from '@angular/core/testing';
import { PageSweep, SWEEP_MS } from '@shared/effects/page-sweep/page-sweep.service';
import type { Place } from '@utils/collection-transition.util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionTransition } from './collection-transition';

const list: Place = { kind: 'list' };
const top: Place = { kind: 'collection', id: 'a' };
const child: Place = { kind: 'collection', id: 'b' };
const depthOf = (id: string) => (id === 'a' ? 1 : id === 'b' ? 2 : 0);

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduce'),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function create(): CollectionTransition {
  TestBed.configureTestingModule({ providers: [CollectionTransition, PageSweep] });
  return TestBed.inject(CollectionTransition);
}

describe('CollectionTransition', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] }));

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the first place at once', () => {
    stubReducedMotion(false);
    const transition = create();
    transition.go(top, depthOf);
    expect(transition.shown()).toEqual(top);
    expect(transition.leaving()).toBeNull();
    expect(transition.turning()).toBeNull();
  });

  it('opens going deeper: the target underneath, the outgoing place leaving, cleared after the sweep', () => {
    stubReducedMotion(false);
    const transition = create();
    transition.go(list, depthOf);
    transition.go(top, depthOf);

    expect(transition.turning()).toBe('open');
    expect(transition.shown()).toEqual(top);
    expect(transition.leaving()).toEqual(list);
    vi.advanceTimersByTime(SWEEP_MS - 1);
    expect(transition.turning()).toBe('open');
    vi.advanceTimersByTime(1);
    expect(transition.turning()).toBeNull();
    expect(transition.leaving()).toBeNull();
  });

  it('closes going up', () => {
    stubReducedMotion(false);
    const transition = create();
    transition.go(child, depthOf);
    transition.go(top, depthOf);
    expect(transition.turning()).toBe('close');
    expect(transition.leaving()).toEqual(child);
  });

  it('finishes a running change first when go() is called during it', () => {
    stubReducedMotion(false);
    const transition = create();
    transition.go(list, depthOf);
    transition.go(top, depthOf);
    vi.advanceTimersByTime(60);
    transition.go(child, depthOf);

    expect(transition.leaving()).toEqual(top);
    expect(transition.shown()).toEqual(child);
    vi.advanceTimersByTime(SWEEP_MS);
    expect(transition.turning()).toBeNull();
    expect(transition.shown()).toEqual(child);
  });

  it('swaps instantly for a redirect', () => {
    stubReducedMotion(false);
    const transition = create();
    transition.go(top, depthOf);
    transition.go(list, depthOf, true);
    expect(transition.shown()).toEqual(list);
    expect(transition.turning()).toBeNull();
  });

  it('swaps instantly under reduced motion', () => {
    stubReducedMotion(true);
    const transition = create();
    transition.go(list, depthOf);
    transition.go(top, depthOf);
    expect(transition.shown()).toEqual(top);
    expect(transition.leaving()).toBeNull();
    expect(transition.turning()).toBeNull();
  });
});

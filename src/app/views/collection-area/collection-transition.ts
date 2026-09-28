import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { REDUCED_MOTION_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { ORB_COUNT, makeOrbs, transitionDir, type Orb, type Place } from '@utils/collection-transition.util';

const OUT_MS = 140;
const RELEASE_MS = 280;
const ORB_CLEAR_MS = 1500;

/** How the content column measures itself, so `go()` can lock/animate its height. */
export interface TransitionMeasure {
  /** The locked wrapper's current rendered height (measured before "out"). */
  outer: () => number;
  /** The new content's natural height (measured right after the swap, while still locked). */
  inner: () => number;
}

/**
 * View-provided controller for the collection area's page transition (research R9, DESIGN.md
 * Motion "Collections page transition"). Provided per `CollectionArea` instance, not root.
 */
@Injectable()
export class CollectionTransition {
  private readonly reducedMotion = mediaQuerySignal(REDUCED_MOTION_QUERY);

  readonly shown = signal<Place>({ kind: 'list' });
  readonly phase = signal<'idle' | 'out' | 'in'>('idle');
  readonly dir = signal<1 | -1>(1);
  readonly lockHeight = signal<number | null>(null);
  readonly orbs = signal<Orb[]>([]);
  /** True only for the one frame right after the swap, before the "in" transition starts. */
  readonly entering = signal(false);

  private initialized = false;
  private runId = 0;
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  private readonly frames: number[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  /**
   * Moves to `target`. The very first call (before anything has been shown) sets it instantly,
   * with no lock and no orbs — there is nothing to animate away from yet. A call while a run is
   * already in flight cancels it and starts fresh from the currently displayed place.
   */
  go(target: Place, depthOf: (id: string) => number, measure: TransitionMeasure): void {
    if (!this.initialized) {
      this.initialized = true;
      this.shown.set(target);
      this.dir.set(1);
      this.phase.set('idle');
      return;
    }

    const dir = transitionDir(this.shown(), target, depthOf);
    this.clearTimers();
    const run = ++this.runId;

    if (this.reducedMotion()) {
      this.shown.set(target);
      this.dir.set(dir);
      this.phase.set('idle');
      this.entering.set(false);
      this.lockHeight.set(null);
      this.orbs.set([]);
      return;
    }

    this.dir.set(dir);
    this.lockHeight.set(measure.outer());
    this.orbs.set(makeOrbs(ORB_COUNT, dir, Math.random));
    this.phase.set('out');

    this.after(OUT_MS, () => {
      if (run !== this.runId) return;
      this.shown.set(target);
      this.entering.set(true);
      this.phase.set('in');
      this.nextFrame(() => {
        if (run !== this.runId) return;
        this.entering.set(false);
        this.lockHeight.set(measure.inner());
      });
    });

    this.after(OUT_MS + RELEASE_MS, () => {
      if (run !== this.runId) return;
      this.lockHeight.set(null);
      this.phase.set('idle');
    });

    this.after(ORB_CLEAR_MS, () => {
      if (run !== this.runId) return;
      this.orbs.set([]);
    });
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  // Two frames, so the swapped-in content paints at its start offset before "in" moves it.
  private nextFrame(fn: () => void): void {
    const outer = requestAnimationFrame(() => {
      const inner = requestAnimationFrame(fn);
      this.frames.push(inner);
    });
    this.frames.push(outer);
  }

  private clearTimers(): void {
    for (const timer of this.timers.splice(0)) {
      clearTimeout(timer);
    }
    for (const frame of this.frames.splice(0)) {
      cancelAnimationFrame(frame);
    }
  }
}

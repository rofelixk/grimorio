import { Injectable, inject, signal } from '@angular/core';
import { PageSweep, type SweepDir } from '@shared/effects/page-sweep/page-sweep.service';
import { REDUCED_MOTION_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { transitionDir, type Place } from '@utils/collection-transition.util';

/**
 * View-provided controller for the collection area's page change (DESIGN.md Motion "Collections
 * page change"): the page sweep, opening going deeper or sideways and closing going up. Provided
 * per `CollectionArea` instance, with its own `PageSweep`: its timer and rAF loop die with the view.
 */
@Injectable()
export class CollectionTransition {
  private readonly sweep = inject(PageSweep);
  readonly reducedMotion = mediaQuerySignal(REDUCED_MOTION_QUERY);

  /** The place rendered underneath: the incoming one, from the start of a change. */
  readonly shown = signal<Place>({ kind: 'list' });
  /** The outgoing place, dissolving over `shown` while a change runs. */
  readonly leaving = signal<Place | null>(null);
  readonly turning = signal<SweepDir | null>(null);

  private initialized = false;

  /**
   * Moves to `target`. The first call shows it instantly, and so does an `instant` one (a redirect)
   * and every call under reduced motion. A call during a change finishes that change first.
   */
  go(target: Place, depthOf: (id: string) => number, instant = false): void {
    if (!this.initialized) {
      this.initialized = true;
      this.shown.set(target);
      return;
    }
    if (this.turning()) {
      this.finish();
    }

    const from = this.shown();
    if (instant || this.reducedMotion()) {
      this.sweep.stop();
      this.shown.set(target);
      return;
    }

    const dir: SweepDir = transitionDir(from, target, depthOf) === 1 ? 'open' : 'close';
    this.leaving.set(from);
    this.shown.set(target);
    this.turning.set(dir);
    this.sweep.start(dir, () => this.turning() !== null, () => this.finish());
  }

  private finish(): void {
    this.leaving.set(null);
    this.turning.set(null);
  }
}

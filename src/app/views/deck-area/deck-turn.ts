import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { PageSweep } from '@shared/effects/page-sweep/page-sweep';
import { REDUCED_MOTION_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { type DeckNav, type DeckPlace, samePlace, turnFor } from '@utils/deck-turn.util';

/**
 * View-provided controller for the deck area's page change (spec 009 FR-018, research R8–R10;
 * DESIGN.md Motion "Decks page change"): decides which navigations sweep and runs `PageSweep` for
 * them. Provided per `DeckArea` instance, with its own `PageSweep`: its timers and rAF loop die with
 * the view.
 */
@Injectable()
export class DeckTurn {
  private readonly router = inject(Router);
  private readonly sweep = inject(PageSweep);
  readonly reducedMotion = mediaQuerySignal(REDUCED_MOTION_QUERY);

  /** The place rendered underneath (during a close, the deck stays until the list lands). */
  readonly shown = signal<DeckPlace>({ kind: 'list' });
  readonly turning = signal<'open' | 'close' | null>(null);

  private initialized = false;
  private lastNav: DeckNav | null = null;
  private pendingClose: DeckPlace | null = null;

  constructor() {
    const sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        const extras = this.router.currentNavigation()?.extras;
        this.lastNav = { trigger: event.navigationTrigger ?? 'imperative', info: extras?.info, replaceUrl: extras?.replaceUrl };
      }
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  /**
   * Moves to `to`. The first call shows it instantly. Otherwise the navigation decides (research
   * R8): a page change, or an instant swap for everything else and under reduced motion. A call
   * during a change finishes that change instantly first.
   */
  go(to: DeckPlace, nav: DeckNav | null = this.lastNav): void {
    if (!this.initialized) {
      this.initialized = true;
      this.shown.set(to);
      return;
    }
    if (this.turning()) {
      this.finishTurn();
    }
    if (samePlace(this.shown(), to)) return;

    const dir = turnFor(this.shown(), to, nav);
    if (!dir || this.reducedMotion()) {
      this.shown.set(to);
      return;
    }

    this.turning.set(dir);
    if (dir === 'open') {
      this.shown.set(to);
    } else {
      this.pendingClose = to;
    }
    this.sweep.start(dir, () => this.turning() !== null, () => this.finishTurn());
  }

  private finishTurn(): void {
    if (this.pendingClose) {
      this.shown.set(this.pendingClose);
      this.pendingClose = null;
    }
    this.turning.set(null);
  }
}

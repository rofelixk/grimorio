import {
  DestroyRef,
  type Signal,
  type WritableSignal,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { REDUCED_MOTION_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { type PageNav, type PageRule, type SweepDir, sweepInfo } from '@utils/page-change.util';

/** One running sweep. A new object per sweep, so a sweep replacing another is always a new value. */
export interface SweepRun {
  readonly dir: SweepDir;
}

/**
 * An area's page change (DESIGN.md Motion "Page sweep"): which place is shown, which one is
 * leaving, and the running sweep. `<app-page-sweep>` renders and draws it; the area's `PageRule`
 * says which changes sweep. Create it with `injectPageChange`.
 */
export class PageChange<P> {
  private readonly shownState: WritableSignal<P>;
  private readonly leavingState = signal<P | null>(null);
  private readonly runState = signal<SweepRun | null>(null);
  private started = false;

  /** The incoming place, rendered underneath from the start of a change. */
  readonly shown: Signal<P>;
  /** The outgoing place, dissolving over `shown` while a sweep runs. */
  readonly leaving = this.leavingState.asReadonly();
  readonly run = this.runState.asReadonly();

  constructor(
    private readonly rule: PageRule<P>,
    readonly reducedMotion: Signal<boolean>,
    private readonly nav: () => PageNav | null,
  ) {
    this.shownState = signal(rule.initial);
    this.shown = this.shownState.asReadonly();
  }

  /**
   * Moves to `to`. The first call shows it instantly. A call during a sweep finishes that sweep
   * first. Then the same place does nothing; reduced motion, `NO_SWEEP_INFO` and the rule's `null`
   * swap instantly; anything else sweeps in the rule's direction.
   */
  go(to: P): void {
    untracked(() => {
      if (!this.started) {
        this.started = true;
        this.shownState.set(to);
        return;
      }
      if (this.runState()) {
        this.leavingState.set(null);
        this.runState.set(null);
      }
      const from = this.shownState();
      if (this.rule.same(from, to)) return;

      const nav = this.nav();
      const dir = this.reducedMotion() || sweepInfo(nav) === false ? null : this.rule.sweep(from, to, nav);
      if (dir === null) {
        this.shownState.set(to);
        return;
      }
      this.leavingState.set(from);
      this.shownState.set(to);
      this.runState.set({ dir });
    });
  }

  /** The sweep's front has crossed. Ignored when `run` is no longer the running sweep. */
  end(run: SweepRun): void {
    if (this.runState() !== run) return;
    this.leavingState.set(null);
    this.runState.set(null);
  }
}

/**
 * Creates an area's page change; call in an injection context (a field initializer). It records
 * each navigation at its `NavigationStart` and follows `target`, the routed place, whenever it's
 * non-null (`null` while the place is missing, left to the area's redirect). `target` may read
 * signals declared later in the class.
 */
export function injectPageChange<P>(options: PageRule<P> & { target: () => P | null }): PageChange<P> {
  const router = inject(Router);
  let nav: PageNav | null = null;
  const sub = router.events.subscribe((event) => {
    if (event instanceof NavigationStart) {
      nav = { trigger: event.navigationTrigger ?? 'imperative', info: router.currentNavigation()?.extras.info };
    }
  });
  inject(DestroyRef).onDestroy(() => sub.unsubscribe());

  const change = new PageChange<P>(options, mediaQuerySignal(REDUCED_MOTION_QUERY), () => nav);
  effect(() => {
    const to = options.target();
    if (to !== null) change.go(to);
  });
  return change;
}

/**
 * A signal of `read(key())` that keeps its last value while the key is unchanged and `read`
 * returns `undefined` (a record removed mid-sweep), so an outgoing page never goes blank. It
 * resets when the key changes, and is `undefined` for a `null` key.
 */
export function retained<K, T>(key: () => K | null, read: (key: K) => T | undefined): Signal<T | undefined> {
  return linkedSignal<{ key: K | null; value: T | undefined }, T | undefined>({
    source: () => {
      const k = key();
      return { key: k, value: k === null ? undefined : read(k) };
    },
    computation: (source, previous) =>
      source.value ??
      (source.key !== null && previous && Object.is(previous.source.key, source.key) ? previous.value : undefined),
  }).asReadonly();
}

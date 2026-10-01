import { type Signal, type WritableSignal, computed, inject, linkedSignal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { REDUCED_MOTION_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { type PageNav, type PageRule, type SweepDir, sweepInfo } from '@utils/page-change.util';

/** One running sweep. A new object per sweep, so a sweep replacing another is always a new value. */
export interface SweepRun {
  readonly dir: SweepDir;
}

interface PageState<P> {
  /** A first non-null target has been shown. */
  started: boolean;
  shown: P;
  leaving: P | null;
  run: SweepRun | null;
}

/**
 * An area's page change (DESIGN.md Motion "Page sweep"): which place is shown, which one is
 * leaving, and the running sweep, derived from `target`, the routed place. `<app-page-sweep>`
 * renders and draws it; the area's `PageRule` says which changes sweep. Create it with
 * `injectPageChange`.
 */
export class PageChange<P> {
  private readonly state: WritableSignal<PageState<P>>;

  /** The incoming place, rendered underneath from the start of a change. */
  readonly shown: Signal<P>;
  /** The outgoing place, dissolving over `shown` while a sweep runs. */
  readonly leaving: Signal<P | null>;
  readonly run: Signal<SweepRun | null>;

  /**
   * `target` is followed whenever it's non-null (`null` while the place is missing). The first
   * place shows instantly. A change during a sweep finishes that sweep first. Then the same place
   * does nothing; reduced motion, `NO_SWEEP_INFO` and the rule's `null` swap instantly; anything
   * else sweeps in the rule's direction. `nav` is the navigation that set the target.
   */
  constructor(
    rule: PageRule<P>,
    readonly reducedMotion: Signal<boolean>,
    target: () => P | null,
    nav: () => PageNav | null,
  ) {
    this.state = linkedSignal<P | null, PageState<P>>({
      source: target,
      computation: (to, previous) => {
        if (!previous) return { started: to !== null, shown: to ?? rule.initial, leaving: null, run: null };
        const s = previous.value;
        if (to === null) return s;
        if (!s.started) return { started: true, shown: to, leaving: null, run: null };
        if (rule.same(s.shown, to)) return s.run ? { ...s, leaving: null, run: null } : s;

        const dir = untracked(() => {
          const current = nav();
          return reducedMotion() || sweepInfo(current) === false ? null : rule.sweep(s.shown, to, current);
        });
        return dir === null
          ? { started: true, shown: to, leaving: null, run: null }
          : { started: true, shown: to, leaving: s.shown, run: { dir } };
      },
    });
    this.shown = computed(() => this.state().shown);
    this.leaving = computed(() => this.state().leaving);
    this.run = computed(() => this.state().run);
  }

  /** The sweep's front has crossed. Ignored when `run` is no longer the running sweep. */
  end(run: SweepRun): void {
    const s = untracked(this.state);
    if (s.run !== run) return;
    this.state.set({ ...s, leaving: null, run: null });
  }
}

/**
 * Creates an area's page change; call in an injection context (a field initializer). It follows
 * `target`, the routed place, whenever it's non-null (`null` while the place is missing, left to
 * the area's redirect), and reads the navigation that set it from the router. `target` may read
 * signals declared later in the class.
 */
export function injectPageChange<P>(options: PageRule<P> & { target: () => P | null }): PageChange<P> {
  const router = inject(Router);
  // While the target's navigation activates it's the current one; once it lands, the last successful one.
  const nav = (): PageNav | null => {
    const current = router.currentNavigation() ?? router.lastSuccessfulNavigation();
    return current ? { trigger: current.trigger, info: current.extras.info } : null;
  };
  return new PageChange<P>(options, mediaQuerySignal(REDUCED_MOTION_QUERY), options.target, nav);
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

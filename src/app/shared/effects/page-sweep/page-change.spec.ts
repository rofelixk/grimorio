import { Component, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_SWEEP_INFO, type PageNav, type PageRule, SWEEP_INFO } from '@utils/page-change.util';
import { PageChange, injectPageChange, retained } from './page-change';

/** Places are letters; deeper letters open, earlier ones close, and 'x' always swaps instantly. */
const RULE: PageRule<string> = {
  initial: 'a',
  same: (a, b) => a === b,
  sweep: (from, to) => (to === 'x' ? null : to > from ? 'open' : 'close'),
};

describe('PageChange', () => {
  let reduced: ReturnType<typeof signal<boolean>>;
  let nav: PageNav | null;
  /** Every set is a new routed value, as an area's routed place is a new object per navigation. */
  let target: WritableSignal<string | null>;
  let change: PageChange<string>;

  function create(): PageChange<string> {
    change = new PageChange(RULE, reduced, target, () => nav);
    return change;
  }

  /** Routes to `to`, then reads the change, as rendering the area after each navigation does. */
  function go(to: string | null): void {
    target.set(to);
    change.shown();
  }

  beforeEach(() => {
    reduced = signal(false);
    nav = null;
    target = signal<string | null>(null, { equal: () => false });
  });

  it('starts on the rule’s initial place, with nothing running', () => {
    create();

    expect(change.shown()).toBe('a');
    expect(change.leaving()).toBeNull();
    expect(change.run()).toBeNull();
  });

  it('shows the first place instantly', () => {
    create();
    go('c');

    expect(change.shown()).toBe('c');
    expect(change.run()).toBeNull();
  });

  it('is current on the first read after the target changes, with no tick', () => {
    create();
    go('a');
    target.set('b');

    expect(change.shown()).toBe('b');
    expect(change.leaving()).toBe('a');
    expect(change.run()).toEqual({ dir: 'open' });
  });

  it('sweeps: the new place underneath, the old one leaving, in the rule’s direction', () => {
    create();
    go('a');
    go('b');

    expect(change.shown()).toBe('b');
    expect(change.leaving()).toBe('a');
    expect(change.run()).toEqual({ dir: 'open' });

    go('b');
    expect(change.run()).toBeNull();
  });

  it('ends a sweep, ignoring a stale end', () => {
    create();
    go('a');
    go('b');
    const first = change.run()!;
    go('a');
    const second = change.run()!;

    change.end(first);
    expect(change.run()).toBe(second);
    expect(change.leaving()).toBe('b');

    change.end(second);
    expect(change.run()).toBeNull();
    expect(change.leaving()).toBeNull();
    expect(change.shown()).toBe('a');
  });

  it('closes going back', () => {
    create();
    go('c');
    go('b');

    expect(change.run()).toEqual({ dir: 'close' });
    expect(change.leaving()).toBe('c');
  });

  it('swaps instantly when the rule says so', () => {
    create();
    go('a');
    go('x');

    expect(change.shown()).toBe('x');
    expect(change.run()).toBeNull();
    expect(change.leaving()).toBeNull();
  });

  it('swaps instantly for a NO_SWEEP_INFO navigation, before asking the rule', () => {
    const sweep = vi.spyOn(RULE, 'sweep');
    create();
    go('a');
    nav = { trigger: 'imperative', info: NO_SWEEP_INFO };
    go('b');

    expect(change.shown()).toBe('b');
    expect(change.run()).toBeNull();
    expect(sweep).not.toHaveBeenCalled();
    sweep.mockRestore();
  });

  it('swaps instantly under reduced motion', () => {
    reduced.set(true);
    create();
    go('a');
    go('b');

    expect(change.shown()).toBe('b');
    expect(change.run()).toBeNull();
  });

  it('does nothing for the place already shown', () => {
    create();
    go('a');
    go('a');

    expect(change.run()).toBeNull();
    expect(change.leaving()).toBeNull();
  });

  it('keeps its place while the target is missing', () => {
    create();
    go('b');
    go(null);

    expect(change.shown()).toBe('b');
    expect(change.run()).toBeNull();
  });

  it('passes the captured navigation to the rule', () => {
    const sweep = vi.spyOn(RULE, 'sweep');
    create();
    go('a');
    nav = { trigger: 'popstate', info: SWEEP_INFO };
    go('b');

    expect(sweep).toHaveBeenCalledWith('a', 'b', nav);
    sweep.mockRestore();
  });

  describe('a change during a change', () => {
    it('finishes the running sweep and starts a new one from the place just reached', () => {
      create();
      go('a');
      go('b');
      const first = change.run();
      go('c');

      expect(change.run()).not.toBe(first);
      expect(change.run()).toEqual({ dir: 'open' });
      expect(change.leaving()).toBe('b');
      expect(change.shown()).toBe('c');
    });

    it('starts a new run object even in the same direction', () => {
      create();
      go('a');
      go('b');
      const first = change.run();
      go('c');

      expect(first?.dir).toBe(change.run()?.dir);
      expect(change.run()).not.toBe(first);
    });

    it('finishes the running sweep with nothing new for an instant swap', () => {
      create();
      go('a');
      go('b');
      go('x');

      expect(change.run()).toBeNull();
      expect(change.leaving()).toBeNull();
      expect(change.shown()).toBe('x');
    });

    it('finishes the running sweep with nothing new for a NO_SWEEP_INFO navigation', () => {
      create();
      go('a');
      go('b');
      nav = { trigger: 'imperative', info: NO_SWEEP_INFO };
      go('c');

      expect(change.run()).toBeNull();
      expect(change.shown()).toBe('c');
    });

    it('finishes the running sweep with nothing new under reduced motion', () => {
      create();
      go('a');
      go('b');
      reduced.set(true);
      go('c');

      expect(change.run()).toBeNull();
      expect(change.leaving()).toBeNull();
      expect(change.shown()).toBe('c');
    });

    it('finishes the running sweep when returning to the place already shown', () => {
      create();
      go('a');
      go('b');
      go('b');

      expect(change.run()).toBeNull();
      expect(change.leaving()).toBeNull();
      expect(change.shown()).toBe('b');
    });

    it('ignores the finished sweep’s late end', () => {
      create();
      go('a');
      go('b');
      const first = change.run()!;
      go('x');
      go('c');
      const current = change.run();

      change.end(first);
      expect(change.run()).toBe(current);
    });

    it('does not let a redirect back to the shown place make the next navigation instant', () => {
      create();
      go('a');
      nav = { trigger: 'imperative', info: NO_SWEEP_INFO };
      go('a');
      nav = { trigger: 'imperative' };
      go('b');

      expect(change.run()).toEqual({ dir: 'open' });
    });
  });
});

describe('injectPageChange', () => {
  @Component({ template: '' })
  class Blank {}

  let target: ReturnType<typeof signal<string | null>>;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '', component: Blank }, { path: 'b', component: Blank }])],
    });
    target = signal<string | null>(null);
  });

  afterEach(() => vi.unstubAllGlobals());

  function create(rule: PageRule<string> = RULE): PageChange<string> {
    return TestBed.runInInjectionContext(() => injectPageChange({ ...rule, target: () => target() }));
  }

  it('does nothing while the target is null', () => {
    const change = create();

    expect(change.shown()).toBe('a');
    target.set('c');
    expect(change.shown()).toBe('c');
    expect(change.run()).toBeNull();
  });

  it('follows the target', () => {
    const change = create();
    target.set('a');
    expect(change.shown()).toBe('a');
    target.set('b');

    expect(change.shown()).toBe('b');
    expect(change.run()).toEqual({ dir: 'open' });
  });

  it('passes the trigger and info of the navigation that set the target', async () => {
    const sweep = vi.fn(RULE.sweep);
    const change = create({ ...RULE, sweep });
    target.set('a');
    change.shown();

    await TestBed.inject(Router).navigate(['/b'], { info: SWEEP_INFO });
    target.set('b');
    change.shown();

    expect(sweep).toHaveBeenCalledWith('a', 'b', { trigger: 'imperative', info: SWEEP_INFO });
  });
});

describe('retained', () => {
  it('follows read(key) and keeps the last value while the key is unchanged', () => {
    const key = signal<string | null>('k1');
    const records = signal<Record<string, string>>({ k1: 'one' });
    const value = TestBed.runInInjectionContext(() => retained(() => key(), (k) => records()[k]));

    expect(value()).toBe('one');
    records.set({ k1: 'uno' });
    expect(value()).toBe('uno');
    records.set({});
    expect(value()).toBe('uno');
  });

  it('resets on a new key and is undefined for a null key', () => {
    const key = signal<string | null>('k1');
    const records = signal<Record<string, string>>({ k1: 'one' });
    const value = TestBed.runInInjectionContext(() => retained(() => key(), (k) => records()[k]));
    expect(value()).toBe('one');

    key.set('k2');
    expect(value()).toBeUndefined();
    key.set(null);
    expect(value()).toBeUndefined();
  });
});

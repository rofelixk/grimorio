import { Component, signal } from '@angular/core';
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

  function create(): PageChange<string> {
    return new PageChange(RULE, reduced, () => nav);
  }

  beforeEach(() => {
    reduced = signal(false);
    nav = null;
  });

  it('starts on the rule’s initial place, with nothing running', () => {
    const change = create();

    expect(change.shown()).toBe('a');
    expect(change.leaving()).toBeNull();
    expect(change.run()).toBeNull();
  });

  it('shows the first place instantly', () => {
    const change = create();
    change.go('c');

    expect(change.shown()).toBe('c');
    expect(change.run()).toBeNull();
  });

  it('sweeps: the new place underneath, the old one leaving, in the rule’s direction', () => {
    const change = create();
    change.go('a');
    change.go('b');

    expect(change.shown()).toBe('b');
    expect(change.leaving()).toBe('a');
    expect(change.run()).toEqual({ dir: 'open' });

    change.go('b');
    expect(change.run()).toBeNull();
  });

  it('ends a sweep, ignoring a stale end', () => {
    const change = create();
    change.go('a');
    change.go('b');
    const first = change.run()!;
    change.go('a');
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
    const change = create();
    change.go('c');
    change.go('b');

    expect(change.run()).toEqual({ dir: 'close' });
    expect(change.leaving()).toBe('c');
  });

  it('swaps instantly when the rule says so', () => {
    const change = create();
    change.go('a');
    change.go('x');

    expect(change.shown()).toBe('x');
    expect(change.run()).toBeNull();
    expect(change.leaving()).toBeNull();
  });

  it('swaps instantly for a NO_SWEEP_INFO navigation, before asking the rule', () => {
    const sweep = vi.spyOn(RULE, 'sweep');
    const change = create();
    change.go('a');
    nav = { trigger: 'imperative', info: NO_SWEEP_INFO };
    change.go('b');

    expect(change.shown()).toBe('b');
    expect(change.run()).toBeNull();
    expect(sweep).not.toHaveBeenCalled();
    sweep.mockRestore();
  });

  it('swaps instantly under reduced motion', () => {
    reduced.set(true);
    const change = create();
    change.go('a');
    change.go('b');

    expect(change.shown()).toBe('b');
    expect(change.run()).toBeNull();
  });

  it('does nothing for the place already shown', () => {
    const change = create();
    change.go('a');
    change.go('a');

    expect(change.run()).toBeNull();
    expect(change.leaving()).toBeNull();
  });

  it('passes the captured navigation to the rule', () => {
    const sweep = vi.spyOn(RULE, 'sweep');
    const change = create();
    change.go('a');
    nav = { trigger: 'popstate', info: SWEEP_INFO };
    change.go('b');

    expect(sweep).toHaveBeenCalledWith('a', 'b', nav);
    sweep.mockRestore();
  });

  describe('a change during a change', () => {
    it('finishes the running sweep and starts a new one from the place just reached', () => {
      const change = create();
      change.go('a');
      change.go('b');
      const first = change.run();
      change.go('c');

      expect(change.run()).not.toBe(first);
      expect(change.run()).toEqual({ dir: 'open' });
      expect(change.leaving()).toBe('b');
      expect(change.shown()).toBe('c');
    });

    it('starts a new run object even in the same direction', () => {
      const change = create();
      change.go('a');
      change.go('b');
      const first = change.run();
      change.go('c');

      expect(first?.dir).toBe(change.run()?.dir);
      expect(change.run()).not.toBe(first);
    });

    it('finishes the running sweep with nothing new for an instant swap', () => {
      const change = create();
      change.go('a');
      change.go('b');
      change.go('x');

      expect(change.run()).toBeNull();
      expect(change.leaving()).toBeNull();
      expect(change.shown()).toBe('x');
    });

    it('finishes the running sweep with nothing new for a NO_SWEEP_INFO navigation', () => {
      const change = create();
      change.go('a');
      change.go('b');
      nav = { trigger: 'imperative', info: NO_SWEEP_INFO };
      change.go('c');

      expect(change.run()).toBeNull();
      expect(change.shown()).toBe('c');
    });

    it('finishes the running sweep with nothing new under reduced motion', () => {
      const change = create();
      change.go('a');
      change.go('b');
      reduced.set(true);
      change.go('c');

      expect(change.run()).toBeNull();
      expect(change.leaving()).toBeNull();
      expect(change.shown()).toBe('c');
    });

    it('finishes the running sweep when returning to the place already shown', () => {
      const change = create();
      change.go('a');
      change.go('b');
      change.go('b');

      expect(change.run()).toBeNull();
      expect(change.leaving()).toBeNull();
      expect(change.shown()).toBe('b');
    });

    it('ignores the finished sweep’s late end', () => {
      const change = create();
      change.go('a');
      change.go('b');
      const first = change.run()!;
      change.go('x');
      change.go('c');
      const current = change.run();

      change.end(first);
      expect(change.run()).toBe(current);
    });

    it('does not let a redirect back to the shown place make the next navigation instant', () => {
      const change = create();
      change.go('a');
      nav = { trigger: 'imperative', info: NO_SWEEP_INFO };
      change.go('a');
      nav = { trigger: 'imperative' };
      change.go('b');

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
    TestBed.tick();

    expect(change.shown()).toBe('a');
    target.set('c');
    TestBed.tick();
    expect(change.shown()).toBe('c');
    expect(change.run()).toBeNull();
  });

  it('follows the target', () => {
    const change = create();
    target.set('a');
    TestBed.tick();
    target.set('b');
    TestBed.tick();

    expect(change.shown()).toBe('b');
    expect(change.run()).toEqual({ dir: 'open' });
  });

  it('captures the trigger and info at NavigationStart', async () => {
    const sweep = vi.fn(RULE.sweep);
    const change = create({ ...RULE, sweep });
    target.set('a');
    TestBed.tick();

    await TestBed.inject(Router).navigate(['/b'], { info: SWEEP_INFO });
    change.go('b');

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

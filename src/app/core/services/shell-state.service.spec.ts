import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationStart, Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { NAV_PINNED_KEY, ShellState } from './shell-state.service';

type Listener = (event: MediaQueryListEvent) => void;

/** A controllable matchMedia: `flip(matches)` fires the change listeners. */
function stubMatchMedia(initial: boolean) {
  const listeners: Listener[] = [];
  const list = {
    matches: initial,
    addEventListener: (_: string, listener: Listener) => listeners.push(listener),
    removeEventListener: () => undefined,
  };
  vi.stubGlobal('matchMedia', () => list);
  return {
    flip(matches: boolean) {
      list.matches = matches;
      listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
    },
  };
}

describe('ShellState', () => {
  let events: Subject<unknown>;

  function create(): ShellState {
    events = new Subject();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const router = TestBed.inject(Router);
    Object.defineProperty(router, 'events', { value: events });
    return TestBed.inject(ShellState);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('starts unpinned by default', () => {
    expect(create().pinned()).toBe(false);
  });

  it('restores a stored pin', () => {
    localStorage.setItem(NAV_PINNED_KEY, '1');
    expect(create().pinned()).toBe(true);
  });

  it('persists and clears the pin', () => {
    const shell = create();
    shell.setPinned(true);
    expect(shell.pinned()).toBe(true);
    expect(localStorage.getItem(NAV_PINNED_KEY)).toBe('1');
    shell.setPinned(false);
    expect(shell.pinned()).toBe(false);
    expect(localStorage.getItem(NAV_PINNED_KEY)).toBeNull();
  });

  it('survives a throwing localStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const shell = create();
    expect(shell.pinned()).toBe(false);
    expect(() => shell.setPinned(true)).not.toThrow();
    expect(shell.pinned()).toBe(true);
  });

  it('closes the drawer on NavigationStart', () => {
    stubMatchMedia(false);
    const shell = create();
    shell.openDrawer(false);
    expect(shell.drawerOpen()).toBe(true);
    events.next(new NavigationStart(1, '/collection'));
    expect(shell.drawerOpen()).toBe(false);
  });

  it('never opens the drawer when wide', () => {
    stubMatchMedia(true);
    const shell = create();
    shell.openDrawer(true);
    expect(shell.drawerOpen()).toBe(false);
  });

  it('drops the open drawer when the width crosses into wide', () => {
    const media = stubMatchMedia(false);
    const shell = create();
    shell.openDrawer(true);
    expect(shell.openedViaKeyboard()).toBe(true);
    media.flip(true);
    expect(shell.wide()).toBe(true);
    expect(shell.drawerOpen()).toBe(false);
  });
});

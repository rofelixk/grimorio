import { DestroyRef, Injectable, inject, linkedSignal, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { WIDE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';

/** Device preference: the side nav stays pinned open (`'1'`) or not (absent). */
export const NAV_PINNED_KEY = 'grm-nav-pinned';

function readPinned(): boolean {
  try {
    return localStorage.getItem(NAV_PINNED_KEY) === '1';
  } catch {
    return false;
  }
}

// The app shell's layout state (spec 004): which mode it is in, whether the wide side nav is
// pinned (per device, R12) and whether the narrow drawer is open.
@Injectable({ providedIn: 'root' })
export class ShellState {
  /** At or above 960px: side nav; below: top-bar Menu + drawer. */
  readonly wide = mediaQuerySignal(WIDE_QUERY);

  private readonly pinnedSignal = signal(readPinned());
  readonly pinned = this.pinnedSignal.asReadonly();

  // Crossing the breakpoint drops the drawer (R4).
  private readonly drawerOpenSignal = linkedSignal({ source: this.wide, computation: () => false });
  readonly drawerOpen = this.drawerOpenSignal.asReadonly();
  private readonly openedViaKeyboardSignal = signal(false);
  /** The drawer focuses ✕ when opened from the keyboard, else the dialog itself. */
  readonly openedViaKeyboard = this.openedViaKeyboardSignal.asReadonly();

  constructor() {
    const subscription = inject(Router).events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.closeDrawer();
      }
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  /** Applies at once; if storage fails the choice lasts only for the session. */
  setPinned(pinned: boolean): void {
    this.pinnedSignal.set(pinned);
    try {
      if (pinned) {
        localStorage.setItem(NAV_PINNED_KEY, '1');
      } else {
        localStorage.removeItem(NAV_PINNED_KEY);
      }
    } catch {
      // Storage blocked or full: keep the session-only choice.
    }
  }

  openDrawer(viaKeyboard: boolean): void {
    if (this.wide()) {
      return;
    }
    this.openedViaKeyboardSignal.set(viaKeyboard);
    this.drawerOpenSignal.set(true);
  }

  closeDrawer(): void {
    this.drawerOpenSignal.set(false);
  }
}

import { DestroyRef, Signal, inject, signal } from '@angular/core';

export const MOBILE_QUERY = '(max-width: 640px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** A signal tracking a CSS media query; call in an injection context. */
export function mediaQuerySignal(query: string): Signal<boolean> {
  const list = typeof matchMedia === 'function' ? matchMedia(query) : null;
  const matches = signal(list?.matches ?? false);
  if (list) {
    const update = (event: MediaQueryListEvent) => matches.set(event.matches);
    list.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => list.removeEventListener('change', update));
  }
  return matches.asReadonly();
}

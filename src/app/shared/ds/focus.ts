import { ElementRef, Signal, afterRenderEffect } from '@angular/core';

// Focus helpers shared by the modals and the drawer (research R7). Two first-stop strategies: the
// themed modals' priority order on each new screen, and the compact modal's explicit marker
// (Cancelar in a confirmation isn't its first button). None of them throw on a missing root, a
// missing target or a detached element.

/** Tried in order, so a field or action row wins over an earlier plate button or wheel swatch. */
export const FIRST_STOP_ORDER: readonly string[] = [
  'input:not([readonly])',
  'app-action-row button:not([disabled])',
  '[role="listitem"] button:not([disabled])',
  'button:not([disabled])',
];

/** Content marks its own first stop. */
export const MARKED_STOP: readonly string[] = ['[data-autofocus]'];

/** Focuses the first element matching the earliest selector that matches; null if none. */
export function focusFirst(root: ParentNode | null | undefined, order: readonly string[]): HTMLElement | null {
  if (!root) {
    return null;
  }
  for (const selector of order) {
    const target = root.querySelector<HTMLElement>(selector);
    if (target) {
      target.focus();
      return target;
    }
  }
  return null;
}

/** Focuses `el` if it is connected; no-op otherwise. */
export function focusElement(el: HTMLElement | null | undefined, options?: FocusOptions): void {
  if (el?.isConnected) {
    el.focus(options);
  }
}

/** Records the active element now; the returned function gives focus back to it if still connected. */
export function captureFocus(): (options?: FocusOptions) => void {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  return (options) => focusElement(opener, options);
}

/**
 * Injection context: after each render, focus `focusFirst(root(), order)` when `key` changes to a
 * new non-empty value. A re-render with the same key moves nothing.
 */
export function focusOnChange(
  key: Signal<string>,
  root: Signal<ElementRef<HTMLElement> | undefined>,
  order: readonly string[],
): void {
  let last = '';
  afterRenderEffect(() => {
    const next = key();
    if (next && next !== last) {
      focusFirst(root()?.nativeElement, order);
    }
    last = next;
  });
}

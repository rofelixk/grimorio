import { REDUCED_MOTION_QUERY } from '@shared/ds/media-query';

/** Marks every node a flair adds, so a new flair (or a clone) can find and drop the old ones. */
export const FLAIR_CLASS = 'grm-flair';

export const ROLE_COLORS = ['var(--role-primary)', 'var(--role-accent)', 'var(--role-tertiary)'] as const;

/** Under reduced motion no flair plays; the content just swaps (FR-011a). */
export function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** An `aria-hidden`, pointer-less absolutely positioned layer. */
export function flairLayer(css: string): HTMLDivElement {
  const layer = document.createElement('div');
  layer.className = FLAIR_CLASS;
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = `position:absolute;pointer-events:none;${css}`;
  return layer;
}

/** A 3px glowing spark in `color`, hidden until the clock moves it. */
export function spark(color = 'currentColor'): HTMLElement {
  const el = document.createElement('i');
  el.style.cssText =
    `position:absolute;left:0;top:0;width:3px;height:3px;border-radius:50%;` +
    `background:${color};box-shadow:0 0 6px 1px ${color};opacity:0;pointer-events:none`;
  return el;
}

export const easeOutCubic = (q: number) => 1 - Math.pow(1 - q, 3);

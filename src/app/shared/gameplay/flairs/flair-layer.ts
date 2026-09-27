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

/**
 * Stacking inside the game view (DESIGN.md "Flairs"): the light runs above every piece of page UI
 * (console, text, plate, dock, footer) but below the card image, which stays on top. The
 * planeswalk's outgoing snapshot is split: its image sits just above the new image, and the rest
 * of the block (opaque, hiding the new text) sits under the light. The view isolates this
 * stacking; the card image's z-index is set in planar-card.scss.
 */
export const FLAIR_Z = { snapshotBlock: 5, light: 10, image: 20, snapshotImage: 21 } as const;

/**
 * A light layer on `stage` (the game view, positioned and isolated) covering `target`'s box, so
 * the effect can reach past the card and paint over the page UI around it.
 */
export function stageLayer(stage: HTMLElement, target: HTMLElement): HTMLDivElement {
  const s = stage.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const layer = flairLayer(
    `left:${t.left - s.left}px;top:${t.top - s.top}px;width:${t.width}px;height:${t.height}px;z-index:${FLAIR_Z.light}`,
  );
  stage.appendChild(layer);
  return layer;
}

/** `target`'s left edge and vertical middle, in `stage` coordinates. */
export function leftMiddle(stage: HTMLElement, target: HTMLElement): { x: number; y: number } {
  const s = stage.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  return { x: t.left - s.left, y: t.top - s.top + t.height / 2 };
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

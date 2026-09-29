// The page sweep's dust (spec 009 FR-018, research R10; DESIGN.md Motion "Page sweep"). Pure and
// seeded through an injected `random`, so the physics and the ≤ 1 s settle are unit-testable;
// `PageSweep` owns the canvas and the rAF loop. Constants are verbatim from the design handoff.

import type { Color } from '@models/profile.model';
import { IDENTITY_HEX } from './identity.util';

export interface Speck {
  x: number;
  y: number;
  /** Radius in px; the sprite is drawn at 5× this. */
  r: number;
  color: string;
  seed: number;
  /** The push multiplier, 0.6–1.4. */
  jitter: number;
  /** Push velocity (the edge's stir). */
  kx: number;
  ky: number;
  /** Ambient drift velocity. */
  vx: number;
  vy: number;
  /** Alpha while turning ("visibility = motion"). */
  a: number;
  fadeDelay: number;
  fadeMs: number;
  alphaAtSettle: number;
}

export interface DustFrame {
  /** The frame time in ms (drives the swirl and push phase). */
  t: number;
  edgeX: number;
  /** The edge's per-frame x delta. */
  vex: number;
  /** The page width. */
  width: number;
  turning: boolean;
}

export const SPECKS_DESKTOP = 130;
export const SPECKS_PHONE = 110;
export const SETTLE_MAX_MS = 1000;

export function makeSpecks(count: number, width: number, height: number, colors: readonly string[], random: () => number): Speck[] {
  return Array.from({ length: count }, (_, i) => ({
    x: random() * width,
    y: random() * height,
    r: 0.25 + random() ** 2.2 * 1.1,
    color: colors[i % colors.length],
    seed: random() * 100,
    jitter: 0.6 + random() * 0.8,
    kx: 0,
    ky: 0,
    vx: 0,
    vy: 0,
    a: 0,
    fadeDelay: 0,
    fadeMs: 0,
    alphaAtSettle: 0,
  }));
}

/** The speck colors: the profile's identity, as its identity hexes in order. */
export function dustColors(identity: readonly Color[]): string[] {
  return identity.map((color) => IDENTITY_HEX[color].base);
}

/** The dissolve band trailing the front, in px (`--band` on `.sweep` in styles/_page-sweep.scss). */
export const FRONT_BAND = 160;

/**
 * The front's x on the page at `progress` (0–1), flat and linear like the planeswalk's. The
 * outgoing page dissolves behind it, and close mirrors open: to open it sweeps right → left, from
 * the right side (the list whole) to one band past the left (the list gone); to close it sweeps
 * left → right, from the left side (the deck page whole) to one band past the right.
 */
export function frontX(progress: number, width: number, dir: 'open' | 'close'): number {
  const travel = progress * (width + FRONT_BAND);
  return dir === 'open' ? width - travel : travel;
}

/** One frame of physics, in place (the hot loop). */
export function stepSpeck(s: Speck, { t, edgeX: ex, vex, width, turning }: DustFrame): void {
  const k = width / 300;
  const sigma = 30 * k ** 0.6;
  const cap = 3.5 * Math.sqrt(k);
  const threshold = 1.1 * Math.sqrt(k);

  if (turning) {
    const d = s.x - ex;
    const w = Math.exp(-(d * d) / (2 * sigma * sigma));
    s.kx += vex * w * 0.3 * s.jitter;
    s.ky += (Math.sin(s.seed + t * 0.004) * 0.55 - 0.2) * Math.abs(vex) * w * 0.25;
  }

  // Swirl proportional to push speed, so still specks stay still.
  const speed = Math.hypot(s.kx, s.ky);
  const swirl = Math.min(1, speed);
  s.kx += Math.sin(s.y * 0.04 + t * 0.0021 + s.seed) * 0.06 * swirl;
  s.ky += Math.cos(s.x * 0.04 + t * 0.0017 + s.seed) * 0.06 * swirl;
  if (speed > cap) {
    s.kx *= cap / speed;
    s.ky *= cap / speed;
  }
  s.kx *= 0.95;
  s.ky *= 0.95;

  // Ambient drift: never bright enough to show.
  s.vx += Math.sin(s.y * 0.045 + t * 0.0021 + s.seed) * 0.003;
  s.vy += Math.cos(s.x * 0.045 + t * 0.0017 + s.seed) * 0.003 + 0.002;
  s.vx *= 0.955;
  s.vy *= 0.955;

  s.x += s.vx + s.kx;
  s.y += s.vy + s.ky;

  if (turning) {
    const target = Math.min(1, Math.max(0, (Math.hypot(s.kx, s.ky) - 0.12) / threshold));
    s.a += (target - s.a) * (target > s.a ? 0.3 : 0.04);
  }
}

/**
 * Gives each speck its own fade inside the settle window, so they leave one by one: a delay of
 * 0–30% of `SETTLE_MAX_MS`, then a fade of 30–70% of it. Every speck ends between 30% and 100% of
 * the window, so none is still lit when the canvas is cleared.
 */
export function settleSchedule(specks: Speck[], random: () => number): void {
  for (const s of specks) {
    s.fadeDelay = random() * 0.3 * SETTLE_MAX_MS;
    s.fadeMs = (0.3 + random() * 0.4) * SETTLE_MAX_MS;
    s.alphaAtSettle = s.a;
  }
}

/** A speck's alpha `ms` after the page settled: held until its delay, then linear to 0. */
export function settledAlpha(s: Speck, ms: number): number {
  if (ms <= s.fadeDelay) return s.alphaAtSettle;
  return s.alphaAtSettle * Math.max(0, 1 - (ms - s.fadeDelay) / s.fadeMs);
}

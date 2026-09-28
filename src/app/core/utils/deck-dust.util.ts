// The page turn's dust (spec 009 FR-018, research R10; DESIGN.md Motion "Decks page turn"). Pure
// and seeded through an injected `random`, so the physics and the ≤ 2 s settle are unit-testable;
// `DeckTurn` owns the canvas and the rAF loop. Constants are verbatim from the design handoff.

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

export const SPECKS_DESKTOP = 260;
export const SPECKS_PHONE = 110;
export const SETTLE_MAX_MS = 2000;

export function makeSpecks(count: number, width: number, height: number, colors: readonly string[], random: () => number): Speck[] {
  return Array.from({ length: count }, (_, i) => ({
    x: random() * width,
    y: random() * height,
    r: 0.45 + random() ** 2.2 * 1.1,
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

/** The DS easing `cubic-bezier(0.4, 0, 0.2, 1)` at progress `x` (0–1), so the dust follows the CSS turn. */
export function easeStandard(x: number): number {
  const cx = 3 * 0.4;
  const bx = 3 * (0.2 - 0.4) - cx;
  const ax = 1 - cx - bx;
  const cy = 0;
  const by = 3 * (1 - 0) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  let t = x;
  for (let i = 0; i < 6; i++) {
    const slope = slopeX(t);
    if (Math.abs(slope) < 1e-6) break;
    t -= (sampleX(t) - x) / slope;
  }
  t = Math.min(1, Math.max(0, t));
  return ((ay * t + by) * t + cy) * t;
}

/** The turning edge's screen x for a `rotateY(theta)` page of width `w` under perspective `p`. */
export function edgeX(theta: number, w: number, perspective: number, off: number): number {
  return off + w / 2 + ((w * Math.cos(theta) - w / 2) * perspective) / (perspective + w * Math.sin(theta));
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

/** Gives each speck its own fade (delay 0–600 ms, duration 600–1400 ms), so they leave one by one. */
export function settleSchedule(specks: Speck[], random: () => number): void {
  for (const s of specks) {
    s.fadeDelay = random() * 600;
    s.fadeMs = 600 + random() * 800;
    s.alphaAtSettle = s.a;
  }
}

/** A speck's alpha `ms` after the page settled: held until its delay, then linear to 0. */
export function settledAlpha(s: Speck, ms: number): number {
  if (ms <= s.fadeDelay) return s.alphaAtSettle;
  return s.alphaAtSettle * Math.max(0, 1 - (ms - s.fadeDelay) / s.fadeMs);
}

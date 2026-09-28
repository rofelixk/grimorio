import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { MOBILE_QUERY, REDUCED_MOTION_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import {
  SETTLE_MAX_MS,
  SPECKS_DESKTOP,
  SPECKS_PHONE,
  type Speck,
  easeStandard,
  edgeX,
  makeSpecks,
  settleSchedule,
  settledAlpha,
  stepSpeck,
} from '@utils/deck-dust.util';
import { type DeckNav, type DeckPlace, samePlace, turnFor } from '@utils/deck-turn.util';

export const TURN_MS = 1300;
const PERSPECTIVE = 2800;
const PERSPECTIVE_PHONE = 1100;
const PARCHMENT_FALLBACK = '#f2ede8';

interface DustRun {
  dir: 'open' | 'close';
  ctx: CanvasRenderingContext2D;
  start: number | null;
  settleAt: number | null;
  specks: Speck[];
  sprites: Map<string, HTMLCanvasElement>;
  width: number;
  off: number;
  canvasW: number;
  canvasH: number;
  dpr: number;
  prevEdge: number | null;
}

/**
 * View-provided controller for the deck area's page turn and its dust (spec 009 FR-018, research
 * R8–R10; DESIGN.md Motion "Decks page turn"). Provided per `DeckArea` instance, like
 * `CollectionTransition`: its timers and rAF loop die with the view.
 */
@Injectable()
export class DeckTurn {
  private readonly router = inject(Router);
  private readonly phone = mediaQuerySignal(MOBILE_QUERY);
  readonly reducedMotion = mediaQuerySignal(REDUCED_MOTION_QUERY);

  /** The place rendered underneath (during a close, the deck stays until the list lands). */
  readonly shown = signal<DeckPlace>({ kind: 'list' });
  readonly turning = signal<'open' | 'close' | null>(null);
  /** True for the frames right after a turn starts, so the page paints at its start angle first. */
  readonly entering = signal(false);

  private initialized = false;
  private lastNav: DeckNav | null = null;
  private pendingClose: DeckPlace | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly frames: number[] = [];
  private dustFrame: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private host: HTMLElement | null = null;

  constructor() {
    const sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        const extras = this.router.currentNavigation()?.extras;
        this.lastNav = { trigger: event.navigationTrigger ?? 'imperative', info: extras?.info, replaceUrl: extras?.replaceUrl };
      }
    });
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.clearTurnTimers();
      this.stopDust();
    });
  }

  /**
   * Moves to `to`. The first call shows it instantly. Otherwise the navigation decides (research
   * R8): a turn, or an instant swap for everything else and under reduced motion. A call during a
   * turn finishes that turn instantly first.
   */
  go(to: DeckPlace, nav: DeckNav | null = this.lastNav): void {
    if (!this.initialized) {
      this.initialized = true;
      this.shown.set(to);
      return;
    }
    if (this.turning()) {
      this.finishTurn();
    }
    if (samePlace(this.shown(), to)) return;

    const dir = turnFor(this.shown(), to, nav);
    if (!dir || this.reducedMotion()) {
      this.shown.set(to);
      return;
    }

    this.turning.set(dir);
    this.entering.set(true);
    if (dir === 'open') {
      this.shown.set(to);
    } else {
      this.pendingClose = to;
    }
    this.nextFrame(() => this.entering.set(false));
    this.endTimer = setTimeout(() => this.finishTurn(), TURN_MS);
    this.startDust(dir);
  }

  /** The dust canvas and the element it covers (the view host). */
  attachCanvas(canvas: HTMLCanvasElement, host: HTMLElement): void {
    this.canvas = canvas;
    this.host = host;
  }

  private finishTurn(): void {
    this.clearTurnTimers();
    this.entering.set(false);
    if (this.pendingClose) {
      this.shown.set(this.pendingClose);
      this.pendingClose = null;
    }
    this.turning.set(null);
  }

  // Two frames, so the page paints at its start angle before the transition moves it.
  private nextFrame(fn: () => void): void {
    const outer = requestAnimationFrame(() => {
      this.frames.push(requestAnimationFrame(fn));
    });
    this.frames.push(outer);
  }

  private clearTurnTimers(): void {
    if (this.endTimer !== null) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
    for (const frame of this.frames.splice(0)) {
      cancelAnimationFrame(frame);
    }
  }

  // ── Dust ──────────────────────────────────────────────────────────────────

  private startDust(dir: 'open' | 'close'): void {
    this.stopDust();
    const canvas = this.canvas;
    const host = this.host;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return;

    // Measured on the first frame, once the page layer is rendered.
    this.dustFrame = requestAnimationFrame((now) => {
      const page = host.querySelector<HTMLElement>('.page');
      const width = page?.offsetWidth || host.clientWidth;
      const off = page?.offsetLeft ?? 0;
      const canvasW = host.clientWidth;
      const canvasH = host.clientHeight;
      const dpr = globalThis.devicePixelRatio || 1;
      canvas.width = Math.round(canvasW * dpr);
      canvas.height = Math.round(canvasH * dpr);

      // Parchment until decks have colors (FR-018).
      const parchment = getComputedStyle(host).getPropertyValue('--color-text').trim() || PARCHMENT_FALLBACK;
      const colors = [parchment];
      const sprites = new Map(colors.map((color) => [color, makeSprite(parchment, color)]));
      const count = this.phone() ? SPECKS_PHONE : SPECKS_DESKTOP;
      const specks = makeSpecks(count, width, canvasH, colors, Math.random);
      for (const s of specks) s.x += off;

      const run: DustRun = { dir, ctx, start: null, settleAt: null, specks, sprites, width, off, canvasW, canvasH, dpr, prevEdge: null };
      this.dustStep(run, now);
    });
  }

  private dustStep(run: DustRun, now: number): void {
    run.start ??= now;
    const elapsed = now - run.start;
    const turning = this.turning() !== null && elapsed < TURN_MS;
    if (!turning && run.settleAt === null) {
      run.settleAt = now;
      settleSchedule(run.specks, Math.random);
    }

    const eased = easeStandard(Math.min(1, elapsed / TURN_MS));
    const theta = run.dir === 'open' ? -Math.PI * eased : -Math.PI * (1 - eased);
    const perspective = this.phone() ? PERSPECTIVE_PHONE : PERSPECTIVE;
    const ex = edgeX(theta, run.width, perspective, run.off);
    const vex = run.prevEdge === null ? 0 : ex - run.prevEdge;
    run.prevEdge = ex;

    const { ctx } = run;
    ctx.setTransform(run.dpr, 0, 0, run.dpr, 0, 0);
    ctx.clearRect(0, 0, run.canvasW, run.canvasH);
    let alive = false;
    for (const s of run.specks) {
      stepSpeck(s, { t: now, edgeX: ex, vex, width: run.width, turning });
      const alpha = run.settleAt === null ? s.a : settledAlpha(s, now - run.settleAt);
      if (alpha > 0.01) {
        alive = true;
        const radius = s.r * 5;
        ctx.globalAlpha = alpha * 0.7;
        ctx.drawImage(run.sprites.get(s.color)!, s.x - radius, s.y - radius, radius * 2, radius * 2);
      }
    }
    ctx.globalAlpha = 1;

    // Nothing is left behind: the canvas is cleared and the loop stopped ≤ 2 s after settle.
    if (run.settleAt !== null && (!alive || now - run.settleAt >= SETTLE_MAX_MS)) {
      ctx.clearRect(0, 0, run.canvasW, run.canvasH);
      this.dustFrame = null;
      return;
    }
    this.dustFrame = requestAnimationFrame((next) => this.dustStep(run, next));
  }

  private stopDust(): void {
    if (this.dustFrame !== null) {
      cancelAnimationFrame(this.dustFrame);
      this.dustFrame = null;
    }
    const canvas = this.canvas;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/** The soft speck sprite: parchment core → color → transparent, with a 1 → .55 → 0 alpha mask. */
function makeSprite(core: string, color: string): HTMLCanvasElement {
  const size = 64;
  const half = size / 2;
  const base = document.createElement('canvas');
  base.width = base.height = size;
  const g = base.getContext('2d');
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const o = sprite.getContext('2d');
  if (!g || !o) return sprite;

  const fill = g.createRadialGradient(half, half, 0, half, half, half);
  fill.addColorStop(0, core);
  fill.addColorStop(0.12, color);
  fill.addColorStop(0.45, color);
  fill.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fill;
  g.fillRect(0, 0, size, size);

  o.drawImage(base, 0, 0);
  o.globalCompositeOperation = 'destination-in';
  const mask = o.createRadialGradient(half, half, 0, half, half, half);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.2, 'rgba(0,0,0,.55)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = mask;
  o.fillRect(0, 0, size, size);
  return sprite;
}

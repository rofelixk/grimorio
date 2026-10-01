import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { IdentityService } from '@services/identity.service';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import {
  SETTLE_MAX_MS,
  SPECKS_DESKTOP,
  SPECKS_PHONE,
  type Speck,
  dustColors,
  frontX,
  makeSpecks,
  settleSchedule,
  settledAlpha,
  stepSpeck,
} from '@utils/sweep-dust.util';

/** The front crosses the page in this time, linear; slower also stirs the dust more gently. */
export const SWEEP_MS = 500;
const PARCHMENT_FALLBACK = '#f2ede8';

export type SweepDir = 'open' | 'close';

interface Run {
  dir: SweepDir;
  /** Whether the page change is still running; the dust settles once it isn't. */
  active: () => boolean;
  /** The outgoing page's layer (`.sweep`), whose dissolve front this loop drives. */
  page: HTMLElement | null;
  /** Absent when there's no canvas (or no 2D context): the front still runs, without dust. */
  dust: {
    ctx: CanvasRenderingContext2D;
    specks: Speck[];
    sprites: Map<string, HTMLCanvasElement>;
    canvasW: number;
    canvasH: number;
    dpr: number;
  } | null;
  start: number;
  settleAt: number | null;
  width: number;
  off: number;
  prevEdge: number | null;
}

/**
 * View-provided page sweep with its dust (DESIGN.md Motion "Page sweep"): a flat front crosses the
 * view, stirs the dust, and the outgoing page (the `.sweep` layer, styled by the `page-sweep`
 * partial) dissolves behind it like the planeswalk's light front, the page itself holding still.
 * `open` sweeps right → left, `close` mirrors it. The owning view's transition controller decides
 * when to sweep; this only draws. Its rAF loop dies with the view.
 */
@Injectable()
export class PageSweep {
  private readonly identity = inject(IdentityService);
  private readonly phone = mediaQuerySignal(MOBILE_QUERY);

  private frame: number | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private host: HTMLElement | null = null;
  /** Speck sprites by `parchment|color`, kept across sweeps. */
  private readonly sprites = new Map<string, HTMLCanvasElement>();

  /**
   * The `<main>` scroll captured when a sweep starts, so the outgoing page (offset by it) leaves
   * from where the person was while the incoming one starts at the top.
   */
  readonly pageOffset = signal(0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** The dust canvas and the element it covers (the view host). */
  attach(canvas: HTMLCanvasElement, host: HTMLElement): void {
    this.canvas = canvas;
    this.host = host;
  }

  /**
   * Starts a sweep; `active` reports whether the page change is still running, and `onEnd` fires
   * once the front has crossed — `SWEEP_MS` from the sweep's first frame, so the outgoing layer
   * isn't removed while its band is still fading.
   */
  start(dir: SweepDir, active: () => boolean, onEnd: () => void): void {
    this.stop();
    const host = this.host;
    if (!host) {
      this.endTimer = setTimeout(onEnd, SWEEP_MS);
      return;
    }
    // A quick second change can reuse the `.sweep` element: drop the last front so the new
    // outgoing page starts whole instead of showing the old one's position for a frame.
    host.querySelector<HTMLElement>('.sweep')?.style.removeProperty('--front');

    const main = host.closest('main');
    if (main) {
      this.pageOffset.set(main.scrollTop);
      main.scrollTop = 0;
    }

    // Measured on the first frame, once the outgoing layer is rendered.
    this.frame = requestAnimationFrame((now) => {
      this.endTimer = setTimeout(onEnd, SWEEP_MS);
      const page = host.querySelector<HTMLElement>('.sweep');
      const width = page?.offsetWidth || host.clientWidth;
      const off = page?.offsetLeft ?? 0;
      const run: Run = { dir, active, page, dust: this.makeDust(host, width, off), start: now, settleAt: null, width, off, prevEdge: null };
      this.step(run, now);
    });
  }

  stop(): void {
    if (this.endTimer !== null) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    const canvas = this.canvas;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  private makeDust(host: HTMLElement, width: number, off: number): Run['dust'] {
    const canvas = this.canvas;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return null;
    const canvasW = host.clientWidth;
    const canvasH = host.clientHeight;
    const dpr = globalThis.devicePixelRatio || 1;
    canvas.width = Math.round(canvasW * dpr);
    canvas.height = Math.round(canvasH * dpr);

    // Parchment cores glowing in the profile's colors.
    const parchment = getComputedStyle(host).getPropertyValue('--color-text').trim() || PARCHMENT_FALLBACK;
    const colors = dustColors(this.identity.colors());
    const sprites = new Map(colors.map((color) => [color, this.sprite(parchment, color)]));
    const specks = makeSpecks(this.phone() ? SPECKS_PHONE : SPECKS_DESKTOP, width, canvasH, colors, Math.random);
    for (const s of specks) s.x += off;
    return { ctx, specks, sprites, canvasW, canvasH, dpr };
  }

  private sprite(parchment: string, color: string): HTMLCanvasElement {
    const key = `${parchment}|${color}`;
    let sprite = this.sprites.get(key);
    if (!sprite) {
      sprite = makeSprite(parchment, color);
      this.sprites.set(key, sprite);
    }
    return sprite;
  }

  private step(run: Run, now: number): void {
    const elapsed = now - run.start;
    const turning = run.active() && elapsed < SWEEP_MS;
    if (!turning && run.settleAt === null) {
      run.settleAt = now;
      if (run.dust) settleSchedule(run.dust.specks, Math.random);
    }

    // A flat front, like the planeswalk's: straight across the page at a constant speed, right →
    // left to open and, mirrored, left → right to close.
    const progress = Math.min(1, elapsed / SWEEP_MS);
    const ex = run.off + frontX(progress, run.width, run.dir);
    const vex = run.prevEdge === null ? 0 : ex - run.prevEdge;
    run.prevEdge = ex;

    // The outgoing page stays still and dissolves behind the front.
    if (turning && run.page) {
      run.page.style.setProperty('--front', `${ex - run.off}px`);
    }

    const alive = run.dust ? this.drawDust(run, run.dust, now, ex, vex, turning) : false;

    // Nothing is left behind: the canvas is cleared and the loop stopped ≤ 1 s after settle.
    if (run.settleAt !== null && (!alive || now - run.settleAt >= SETTLE_MAX_MS)) {
      run.dust?.ctx.clearRect(0, 0, run.dust.canvasW, run.dust.canvasH);
      this.frame = null;
      return;
    }
    this.frame = requestAnimationFrame((next) => this.step(run, next));
  }

  private drawDust(run: Run, dust: NonNullable<Run['dust']>, now: number, ex: number, vex: number, turning: boolean): boolean {
    const { ctx } = dust;
    ctx.setTransform(dust.dpr, 0, 0, dust.dpr, 0, 0);
    ctx.clearRect(0, 0, dust.canvasW, dust.canvasH);
    let alive = false;
    const frame = { t: now, edgeX: ex, vex, width: run.width, turning };
    for (const s of dust.specks) {
      stepSpeck(s, frame);
      const alpha = run.settleAt === null ? s.a : settledAlpha(s, now - run.settleAt);
      if (alpha > 0.01) {
        alive = true;
        const radius = s.r * 5;
        ctx.globalAlpha = alpha * 0.7;
        ctx.drawImage(dust.sprites.get(s.color)!, s.x - radius, s.y - radius, radius * 2, radius * 2);
      }
    }
    ctx.globalAlpha = 1;
    return alive;
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

import { DestroyRef, ElementRef, Injectable, inject } from '@angular/core';
import { IdentityService } from '@services/identity.service';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import type { SweepDir } from '@utils/page-change.util';
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

interface Run {
  dir: SweepDir;
  /** Set by `settle()`: the dust settles on the next frame, before the front has crossed. */
  settling: boolean;
  /** Called once, on the frame the front completes, unless the run settled or stopped first. */
  onCrossed: () => void;
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
 * The page sweep's drawing (DESIGN.md Motion "Page sweep"), provided by `PageSweep`: a flat front
 * crosses the view, stirs the dust, and the outgoing page (the `.sweep` layer) dissolves behind it
 * like the planeswalk's light front, the page itself holding still. `open` sweeps right → left,
 * `close` mirrors it. The page change decides when to sweep and when the page has settled; this
 * only draws. Its rAF loop dies with the component.
 */
@Injectable()
export class SweepLoop {
  private readonly identity = inject(IdentityService);
  private readonly phone = mediaQuerySignal(MOBILE_QUERY);
  /** The sweep host, which the dust canvas covers. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private frame: number | null = null;
  private run: Run | null = null;
  /** Speck sprites by `parchment|color`, kept across sweeps. */
  private readonly sprites = new Map<string, HTMLCanvasElement>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /**
   * Starts a sweep, stopping any running one and clearing its dust. `page.layer` is the outgoing
   * page, read now to drop the last front and again on the first frame, once it's rendered;
   * `page.dust` is the canvas, if any, read on the first frame. `onCrossed` fires on the frame the
   * front completes, so the outgoing layer isn't removed while its band is still fading.
   */
  start(
    dir: SweepDir,
    page: { layer: () => HTMLElement | null; dust: () => HTMLCanvasElement | null },
    onCrossed: () => void,
  ): void {
    this.stop();
    const host = this.host;
    // A quick second change can reuse the `.sweep` element: drop the last front so the new
    // outgoing page starts whole instead of showing the old one's position for a frame.
    page.layer()?.style.removeProperty('--front');

    // Measured on the first frame, once the outgoing layer is rendered.
    this.frame = requestAnimationFrame((now) => {
      const layer = page.layer();
      const width = layer?.offsetWidth || host.clientWidth;
      const off = layer?.offsetLeft ?? 0;
      const run: Run = {
        dir,
        settling: false,
        onCrossed,
        page: layer,
        dust: this.makeDust(page.dust(), host, width, off),
        start: now,
        settleAt: null,
        width,
        off,
        prevEdge: null,
      };
      this.run = run;
      this.step(run, now);
    });
  }

  /**
   * The page settled before the front crossed: the front stops and the dust starts its settle at
   * once. A no-op with no sweep running, or once the dust is already settling.
   */
  settle(): void {
    if (this.run) {
      this.run.settling = true;
    } else if (this.frame !== null) {
      // Not drawn yet: nothing to settle.
      this.stop();
    }
  }

  stop(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    const dust = this.run?.dust;
    dust?.ctx.clearRect(0, 0, dust.canvasW, dust.canvasH);
    this.run = null;
  }

  private makeDust(canvas: HTMLCanvasElement | null, host: HTMLElement, width: number, off: number): Run['dust'] {
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
    const turning = !run.settling && elapsed < SWEEP_MS;
    // The front completes on this frame, unless the page settled first.
    let crossed = false;
    if (!turning && run.settleAt === null) {
      run.settleAt = now;
      crossed = !run.settling;
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
      this.run = null;
    } else {
      this.frame = requestAnimationFrame((next) => this.step(run, next));
    }
    if (crossed) run.onCrossed();
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

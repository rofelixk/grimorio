import {
  FLAIR_CLASS,
  FLAIR_Z,
  ROLE_COLORS,
  flairLayer,
  leftMiddle,
  reducedMotion,
  spark,
  stageLayer,
} from './flair-layer';

const DURATION = 1400;
const SPARKS = 270;
const SPARK_LIFE = 520;

interface Spark {
  el: HTMLElement;
  angle: number;
  r0: number;
  dist: number;
  born: number | null;
  color: string;
}

// The planeswalk light front (DESIGN.md "Flairs", handoff 2a): the outgoing card block, cloned
// before the state changes, dissolves along a curved front from its left edge while three role
// glows cross-fade and sparks fly off the front. The snapshot sits just above the new card image;
// the glows and sparks run on the game view's light layer, over the page UI but under the card
// image. One rAF clock drives all of it (R15).
export class PlaneswalkFlair {
  private frame = 0;
  private layers: HTMLElement[] = [];

  /**
   * Snapshots `target` (the positioned card block) now, before the game changes. The returned
   * `play()` runs the effect over the new content on `stage` (the game view); not calling it
   * simply drops the snapshot.
   */
  capture(target: HTMLElement, stage: HTMLElement): () => Promise<void> {
    if (reducedMotion()) {
      return () => Promise.resolve();
    }
    const snapshot = target.cloneNode(true) as HTMLElement;
    snapshot.querySelectorAll(`.${FLAIR_CLASS}`).forEach((node) => node.remove());
    snapshot.removeAttribute('id');
    return () => this.play(target, stage, snapshot);
  }

  /** Stops a running effect and removes its nodes. */
  stop(): void {
    cancelAnimationFrame(this.frame);
    this.layers.forEach((layer) => layer.remove());
    this.layers = [];
  }

  private play(target: HTMLElement, stage: HTMLElement, snapshot: HTMLElement): Promise<void> {
    this.stop();
    // The outgoing block, opaque, under the light (it hides the new text until the front passes)…
    snapshot.style.cssText += ';position:absolute;inset:0;margin:0';
    const block = flairLayer(`inset:0;z-index:${FLAIR_Z.snapshotBlock}`);
    block.appendChild(snapshot);
    // …and only its image, over the new image: everything else in this copy is invisible.
    const imageOnly = snapshot.cloneNode(true) as HTMLElement;
    imageOnly.style.visibility = 'hidden';
    imageOnly.querySelectorAll<HTMLElement>('[data-flair-image]').forEach((el) => (el.style.visibility = 'visible'));
    const cover = flairLayer(`inset:0;z-index:${FLAIR_Z.snapshotImage}`);
    cover.appendChild(imageOnly);
    target.append(block, cover);
    // The mask goes on the (visible) cover, not the hidden copy: Chrome skips a mask on a
    // `visibility: hidden` element and paints its visible children unmasked.
    const masked = [snapshot, cover];

    // The glows fill the whole stage, centered on the block's left edge, so the full circle shows;
    // the sparks ride a layer over the block.
    const glowLayer = flairLayer(`inset:0;z-index:${FLAIR_Z.light}`);
    stage.appendChild(glowLayer);
    const center = leftMiddle(stage, target);
    const layer = stageLayer(stage, target);
    this.layers = [block, cover, glowLayer, layer];

    const w = layer.offsetWidth;
    const h = layer.offsetHeight;
    const maxR = Math.hypot(w, h / 2) + 80;
    const glows = ROLE_COLORS.map(() => {
      const glow = document.createElement('div');
      glow.style.cssText =
        'position:absolute;inset:0;filter:blur(30px);mix-blend-mode:screen;opacity:0;pointer-events:none';
      glowLayer.appendChild(glow);
      return glow;
    });
    const sparks: Spark[] = Array.from({ length: SPARKS }, () => {
      const x = Math.random() * w;
      const dy = Math.random() * h - h / 2;
      const el = spark();
      layer.appendChild(el);
      const r0 = Math.hypot(x, dy);
      const band = r0 / maxR;
      return {
        el,
        angle: Math.atan2(dy, x),
        r0,
        dist: 30 + Math.random() * 60,
        born: null,
        color: ROLE_COLORS[band < 0.34 ? 0 : band < 0.67 ? 1 : 2],
      };
    });

    return new Promise((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / DURATION);
        const radius = -60 + p * (maxR + 60);
        const front = radius + 30;
        const mask = `radial-gradient(circle at 0 50%, transparent ${radius}px, #000 ${radius + 60}px)`;
        for (const el of masked) {
          el.style.setProperty('-webkit-mask-image', mask);
          el.style.maskImage = mask;
        }

        // Primary → accent → tertiary, one after another, never all three at once.
        const fade = Math.min(1, p / 0.08) * Math.min(1, (1 - p) / 0.12);
        const weights = [
          p < 0.25 ? 1 : Math.max(0, 1 - (p - 0.25) / 0.25),
          1 - Math.min(1, Math.abs(p - 0.5) / 0.25),
          p > 0.75 ? 1 : Math.max(0, (p - 0.5) / 0.25),
        ];
        glows.forEach((glow, i) => {
          glow.style.background =
            `radial-gradient(circle at ${center.x}px ${center.y}px, transparent ${front - 120}px, ${ROLE_COLORS[i]} ${front}px, ` +
            `transparent ${front + 120}px)`;
          glow.style.opacity = (weights[i] * fade * 0.9).toFixed(3);
        });

        let live = false;
        for (const s of sparks) {
          if (s.born === null && front >= s.r0) {
            s.born = now;
            s.el.style.color = s.color;
          }
          if (s.born === null) {
            live = true;
            continue;
          }
          const q = (now - s.born) / SPARK_LIFE;
          if (q >= 1) {
            s.el.style.opacity = '0';
            continue;
          }
          live = true;
          const r = s.r0 + q * s.dist;
          s.el.style.transform =
            `translate(${Math.cos(s.angle) * r}px, ${h / 2 + Math.sin(s.angle) * r}px) scale(${1 - 0.7 * q})`;
          s.el.style.opacity = (q < 0.1 ? q / 0.1 : 1 - q).toFixed(3);
        }

        if (p < 1 || live) {
          this.frame = requestAnimationFrame(tick);
        } else {
          this.stop();
          resolve();
        }
      };
      this.frame = requestAnimationFrame(tick);
    });
  }
}

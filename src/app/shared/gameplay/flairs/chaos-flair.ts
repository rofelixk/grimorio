import { ROLE_COLORS, easeOutCubic, reducedMotion, spark, stageLayer } from './flair-layer';

const DURATION = 1100;
const RING_LIFE = 900;
const SPARKS = 198;
const SPARK_LIFE = 700;
const SHAKE = 320;

// The chaos shockwave (DESIGN.md "Flairs", handoff 2b): two role rings and a burst of sparks
// centered on the card image and below it, so only what escapes its edges shows — over the rest of
// the page — and a short decaying shake of the image (`[data-flair-shake]`). One rAF clock drives
// all of it (R15).
export class ChaosFlair {
  private frame = 0;
  private layer: HTMLElement | null = null;
  private shaken: HTMLElement | null = null;

  /**
   * Plays around `target` (the image frame) on `stage` (the game view); resolves at once under
   * reduced motion.
   */
  play(target: HTMLElement, stage: HTMLElement): Promise<void> {
    this.stop();
    if (reducedMotion()) {
      return Promise.resolve();
    }
    const layer = stageLayer(stage, target);
    this.layer = layer;
    this.shaken = target.querySelector<HTMLElement>('[data-flair-shake]');

    const size = Math.min(layer.offsetWidth, layer.offsetHeight) * 1.2;
    const ring = (color: string, width: number) => {
      const el = document.createElement('div');
      el.style.cssText =
        `position:absolute;left:50%;top:50%;width:${size}px;height:${size}px;` +
        `margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;border:${width}px solid ${color};` +
        `box-shadow:0 0 24px ${color},inset 0 0 18px ${color};opacity:0;pointer-events:none`;
      layer.appendChild(el);
      return el;
    };
    const rings: [HTMLElement, number][] = [
      [ring(ROLE_COLORS[0], 2), 0],
      [ring(ROLE_COLORS[1], 1), 140],
    ];
    const sparks = Array.from({ length: SPARKS }, (_, i) => {
      const el = spark(ROLE_COLORS[i % 3]);
      el.style.left = '50%';
      el.style.top = '50%';
      layer.appendChild(el);
      return {
        el,
        angle: (i / SPARKS) * Math.PI * 2 + Math.random() * 0.3,
        dist: size * 0.55 + Math.random() * size * 0.5,
        delay: Math.random() * 120,
      };
    });

    return new Promise((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        for (const [el, delay] of rings) {
          const q = Math.max(0, Math.min(1, (elapsed - delay) / RING_LIFE));
          el.style.transform = `scale(${0.3 + 2.3 * easeOutCubic(q)})`;
          el.style.opacity = q <= 0 ? '0' : (1 - q).toFixed(3);
        }
        for (const s of sparks) {
          const q = Math.max(0, Math.min(1, (elapsed - s.delay) / SPARK_LIFE));
          const r = s.dist * easeOutCubic(q);
          s.el.style.transform = `translate(${Math.cos(s.angle) * r}px, ${Math.sin(s.angle) * r}px) scale(${1 - 0.7 * q})`;
          s.el.style.opacity = q <= 0 ? '0' : (q < 0.1 ? q / 0.1 : 1 - q).toFixed(3);
        }
        if (this.shaken) {
          const shake = elapsed < SHAKE ? Math.sin(elapsed / 18) * 4 * (1 - elapsed / SHAKE) : 0;
          this.shaken.style.transform = shake ? `translate(${shake}px, ${shake * -0.4}px)` : '';
        }
        if (elapsed < DURATION + 120) {
          this.frame = requestAnimationFrame(tick);
        } else {
          this.stop();
          resolve();
        }
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  /** Stops a running effect and removes its nodes. */
  stop(): void {
    cancelAnimationFrame(this.frame);
    this.layer?.remove();
    this.layer = null;
    if (this.shaken) {
      this.shaken.style.transform = '';
      this.shaken = null;
    }
  }
}

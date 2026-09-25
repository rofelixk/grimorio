import { ChangeDetectionStrategy, Component, computed, effect, input, model, signal, untracked } from '@angular/core';
import { Color } from '@models/profile.model';
import { COLOR_NAME, COLOR_ORDER, IDENTITY_HEX, colorNames, tribeName } from '@utils/identity.util';
import { MISC } from '@utils/entry-copy';
import { REDUCED_MOTION_QUERY, mediaQuerySignal } from '../media-query';

export type WheelMode = 'picker' | 'display';

const MAX_PICKS = 3;

/** Swatch top-left (left%, top%) and center (x%, y%), clockwise from the top: W U B R G. */
const POSITION: Record<Color, { left: number; top: number; cx: number; cy: number }> = {
  W: { left: 40.5, top: 3.5, cx: 50, cy: 13 },
  U: { left: 75.7, top: 29.1, cx: 85.2, cy: 38.6 },
  B: { left: 62.3, top: 70.4, cx: 71.8, cy: 79.9 },
  R: { left: 18.7, top: 70.4, cx: 28.2, cy: 79.9 },
  G: { left: 5.3, top: 29.1, cx: 14.8, cy: 38.6 },
};

interface Swatch {
  color: Color;
  label: string;
  hex: string;
  left: number;
  top: number;
  on: boolean;
  locked: boolean;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  hex: string;
  sparks: { dx: string; dy: string; dur: string }[];
}

let nextBurstId = 0;
const rnd = (min: number, max: number) => min + Math.random() * (max - min);

function makeBurst(color: Color): Burst {
  const { cx, cy } = POSITION[color];
  return {
    id: nextBurstId++,
    x: cx,
    y: cy,
    hex: IDENTITY_HEX[color].base,
    sparks: Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2 + rnd(-0.3, 0.3);
      const distance = rnd(26, 46);
      return {
        dx: `${Math.cos(angle) * distance}px`,
        dy: `${Math.sin(angle) * distance}px`,
        dur: `${rnd(0.6, 0.9)}s`,
      };
    }),
  };
}

// The identity wheel (DESIGN.md signature component): five swatches clockwise W → U → B → R → G
// with the tribe name and color names in the center. `picker` mode lets the person pick 1–3
// colors (pick order = role order); `display` mode only shows an identity. With `neutral`, no
// identity is shown — the default belongs to no one — so the center shows the wordmark.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-identity-wheel',
  templateUrl: './identity-wheel.html',
  styleUrl: './identity-wheel.scss',
  host: { '[style.--size]': "size() + 'px'" },
})
export class IdentityWheel {
  readonly mode = input<WheelMode>('display');
  readonly picks = model<Color[]>([]);
  readonly neutral = input(false);
  /** The muted line under the tribe name; defaults to the color names in pick order. */
  readonly subline = input<string | null>(null);
  readonly size = input(300);

  protected readonly wordmark = MISC.wordmark;
  private readonly reducedMotion = mediaQuerySignal(REDUCED_MOTION_QUERY);

  protected readonly lit = computed<Color[]>(() => (this.neutral() ? [] : this.picks()));
  protected readonly tribe = computed(() => tribeName(this.lit()));
  protected readonly sub = computed(() => this.subline() ?? colorNames(this.lit()));
  /** Re-mounts the center so its entrance replays whenever the name changes. */
  protected readonly centerKey = computed(() => [`${this.tribe()}|${this.sub()}`]);

  protected readonly swatches = computed<Swatch[]>(() => {
    const lit = this.lit();
    const picker = this.mode() === 'picker';
    return COLOR_ORDER.map((color) => {
      const on = lit.includes(color);
      return {
        color,
        label: COLOR_NAME[color],
        hex: IDENTITY_HEX[color].base,
        left: POSITION[color].left,
        top: POSITION[color].top,
        on,
        locked: picker && ((!on && lit.length >= MAX_PICKS) || (on && lit.length <= 1)),
      };
    });
  });

  protected readonly bursts = signal<Burst[]>([]);

  constructor() {
    // A ripple and a burst of sparks on every newly lit color (pick, or a retint on link).
    let previous: Color[] | null = null;
    effect(() => {
      const lit = this.lit();
      const added = previous ? lit.filter((c) => !previous!.includes(c)) : [];
      previous = lit;
      if (added.length && !untracked(this.reducedMotion)) {
        this.bursts.update((list) => [...list, ...added.map(makeBurst)]);
      }
    });
  }

  protected toggle(swatch: Swatch): void {
    if (this.mode() !== 'picker' || swatch.locked) {
      return;
    }
    const current = this.picks();
    this.picks.set(swatch.on ? current.filter((c) => c !== swatch.color) : [...current, swatch.color]);
  }

  protected dropBurst(id: number): void {
    this.bursts.update((list) => list.filter((burst) => burst.id !== id));
  }
}

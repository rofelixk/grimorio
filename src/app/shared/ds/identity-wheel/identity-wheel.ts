import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  signal,
  untracked,
} from '@angular/core';
import { Color } from '@models/profile.model';
import { COLOR_NAME, COLOR_ORDER, IDENTITY_HEX, colorNames, tribeName } from '@utils/identity.util';
import { MISC } from '@utils/entry-copy';
import { REDUCED_MOTION_QUERY, mediaQuerySignal } from '../media-query';

export type WheelMode = 'picker' | 'display';

type SwatchState = 'on' | 'off' | 'locked' | 'neutral';

const MAX_PICKS = 3;
const MOTE_EVERY_MS = 700;
const MOTE_CHANCE = 0.26;

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
  state: SwatchState;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  hex: string;
  sparks: { dx: string; dy: string; dur: string }[];
}

/** A 2px speck drifting outward from a picked swatch's edge (px within the wheel). */
interface Mote {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  dur: number;
  peak: number;
  hex: string;
}

let nextFxId = 0;
const rnd = (min: number, max: number) => min + Math.random() * (max - min);

function makeBurst(color: Color): Burst {
  const { cx, cy } = POSITION[color];
  return {
    id: nextFxId++,
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

function makeMote(color: Color, size: number): Mote {
  const { cx, cy } = POSITION[color];
  // Away from the wheel's center, ±0.7 rad, starting on the swatch's edge.
  const angle = Math.atan2(cy - 50, cx - 50) + rnd(-0.7, 0.7);
  const edge = 0.1 * size;
  const distance = rnd(14, 28);
  return {
    id: nextFxId++,
    x: (cx / 100) * size + Math.cos(angle) * edge,
    y: (cy / 100) * size + Math.sin(angle) * edge,
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
    dur: rnd(2.4, 3.6),
    peak: rnd(0.35, 0.6),
    hex: IDENTITY_HEX[color].base,
  };
}

// The identity wheel (DESIGN.md "Identity wheel", v2): five swatches clockwise W → U → B → R → G,
// each a disc + rim + dot, with the tribe name and color names in the center. `picker` mode lets
// the person pick 1–3 colors (pick order = role order); `display` mode only shows an identity.
// With `neutral`, no identity is shown — the default belongs to no one — so the center shows the
// wordmark. Picked colors breathe and shed motes; reduced motion stops every animation.
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
  /** Announces the center's name politely when it changes (the profile modal, ui.md §6). */
  readonly announce = input(false);

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
      let state: SwatchState = 'off';
      if (!lit.length) {
        state = 'neutral';
      } else if (on) {
        state = 'on';
      } else if (picker && lit.length >= MAX_PICKS) {
        state = 'locked';
      }
      return {
        color,
        label: COLOR_NAME[color],
        hex: IDENTITY_HEX[color].base,
        left: POSITION[color].left,
        top: POSITION[color].top,
        on,
        state,
      };
    });
  });

  /** A ripple and a burst of sparks on every newly lit color (pick, or a retint on link). */
  protected readonly bursts = linkedSignal<Color[], Burst[]>({
    source: this.lit,
    computation: (lit, previous) => {
      if (!previous) return [];
      const added = lit.filter((c) => !previous.source.includes(c));
      return added.length && !untracked(this.reducedMotion) ? [...previous.value, ...added.map(makeBurst)] : previous.value;
    },
  });
  protected readonly motes = signal<Mote[]>([]);

  constructor() {
    let timer: ReturnType<typeof setInterval> | null = null;
    afterNextRender(() => {
      timer = setInterval(() => this.emitMotes(), MOTE_EVERY_MS);
    });
    inject(DestroyRef).onDestroy(() => {
      if (timer) {
        clearInterval(timer);
      }
    });
  }

  private emitMotes(): void {
    if (this.reducedMotion()) {
      return;
    }
    const size = this.size();
    const born = this.lit()
      .filter(() => Math.random() < MOTE_CHANCE)
      .map((color) => makeMote(color, size));
    if (born.length) {
      this.motes.update((list) => [...list, ...born]);
    }
  }

  protected toggle(swatch: Swatch): void {
    if (this.mode() !== 'picker') {
      return;
    }
    // Read the live picks, not the rendered swatch, so taps before the next render stay correct.
    const current = this.picks();
    if (current.includes(swatch.color)) {
      // The last pick stays: an identity always has at least one color.
      if (current.length > 1) {
        this.picks.set(current.filter((c) => c !== swatch.color));
      }
    } else if (current.length < MAX_PICKS) {
      this.picks.set([...current, swatch.color]);
    }
  }

  protected dropBurst(id: number): void {
    this.bursts.update((list) => list.filter((burst) => burst.id !== id));
  }

  protected dropMote(id: number): void {
    this.motes.update((list) => list.filter((mote) => mote.id !== id));
  }
}

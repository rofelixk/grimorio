import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';
import { REDUCED_MOTION_QUERY, mediaQuerySignal } from '../media-query';

export type SparkDirection = 'outward' | 'inward';

interface Spark {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  dur: number;
  delay: number;
  color: string;
}

const ROLE_COLORS = ['var(--role-primary)', 'var(--role-accent)', 'var(--role-tertiary)'];
let nextId = 0;

const rnd = (min: number, max: number) => min + Math.random() * (max - min);

// A spark starts on a random point of the ring's perimeter and flies outward 28–84px (desktop)
// or drifts inward 14–36px from the screen edge (mobile), ±60% sideways (DESIGN.md "Sparks").
function makeSpark(direction: SparkDirection, maxDelay: number): Spark {
  const edge = Math.random();
  let x: number;
  let y: number;
  let nx = 0;
  let ny = 0;
  if (edge < 0.35) {
    [x, y, ny] = [rnd(2, 98), 0, -1];
  } else if (edge < 0.7) {
    [x, y, ny] = [rnd(2, 98), 100, 1];
  } else if (edge < 0.85) {
    [x, y, nx] = [0, rnd(4, 96), -1];
  } else {
    [x, y, nx] = [100, rnd(4, 96), 1];
  }
  const distance = direction === 'inward' ? -rnd(14, 36) : rnd(28, 84);
  const sideways = rnd(-0.6, 0.6) * Math.abs(distance);
  return {
    id: nextId++,
    x,
    y,
    dx: nx * distance + (ny ? sideways : 0),
    dy: ny * distance + (nx ? sideways : 0),
    size: rnd(2, 4.5),
    dur: rnd(1.6, 3.2),
    delay: rnd(0, maxDelay),
    color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
  };
}

// Decorative sparks around the themed modal. Each spark gets a new position and color when it
// fades; nothing renders under prefers-reduced-motion (FR-040).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-spark-field',
  templateUrl: './spark-field.html',
  styleUrl: './spark-field.scss',
  host: { 'aria-hidden': 'true' },
})
export class SparkField {
  readonly count = input(20);
  readonly direction = input<SparkDirection>('outward');

  protected readonly reducedMotion = mediaQuerySignal(REDUCED_MOTION_QUERY);
  protected readonly sparks = linkedSignal(() =>
    Array.from({ length: this.count() }, () => makeSpark(this.direction(), 3.2)),
  );

  protected reroll(index: number): void {
    this.sparks.update((list) => list.map((spark, i) => (i === index ? makeSpark(this.direction(), 0.9) : spark)));
  }
}

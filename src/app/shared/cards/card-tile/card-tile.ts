import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { Color } from '@models/card.model';
import { cardPalette } from '@utils/card-colors.util';
import { CARD } from '@utils/card-copy';
import { REDUCED_MOTION_QUERY, mediaQuerySignal } from '@shared/ds/media-query';

/** What the details plate shows, already in display form. */
export interface TileDetails {
  set: string;
  number: string;
  finish: string;
  language: string;
  condition: string;
  quantity: number;
  forSale: boolean;
}

export interface TileCard {
  name: string;
  typeLine?: string;
  imageUrl: string | null;
  colorIdentity: readonly Color[];
}

interface Speck {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  color: string;
}

const SPECKS = 10;
const DISTANCE = 30;
const rnd = (min: number, max: number) => min + Math.random() * (max - min);

// A speck starts on a random point of the card's perimeter and leaves outward by 30px × 0.7–1.5.
function makeSpecks(stops: readonly string[], start: number): Speck[] {
  return Array.from({ length: SPECKS }, (_, k) => {
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
    const reach = DISTANCE * rnd(0.7, 1.5);
    return {
      id: start + k,
      x,
      y,
      dx: nx * reach + (ny !== 0 ? rnd(-0.6, 0.6) * reach : 0),
      dy: ny * reach + (nx !== 0 ? rnd(-0.6, 0.6) * reach : 0),
      size: rnd(2, 4) * 0.7,
      delay: k * 0.07,
      color: stops[k % stops.length],
    };
  });
}

let nextSpeck = 0;

// One card (DESIGN.md "Cards" → "Card tile"): the image or a placeholder with the name, and the
// details plate glued under it. "Com detalhes" (`shown`) keeps the plate in flow, opened by a
// 0fr → 1fr row; "Só imagens" (`hover`) shows it as an overlay on hover or focus. Hover and
// focus-visible draw the card-colored border, halo and scale; a pointer entry also bursts the dust.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-card-tile',
  imports: [NgTemplateOutlet],
  templateUrl: './card-tile.html',
  styleUrl: './card-tile.scss',
  host: {
    '[class.live]': 'specks().length > 0',
    '[style.--tile-border]': 'border()',
    '(pointerenter)': 'burst($event)',
  },
})
export class CardTile {
  readonly card = input.required<TileCard>();
  readonly details = input<TileDetails | null>(null);
  readonly detailsMode = input<'shown' | 'hover'>('shown');
  readonly interactive = input(false);
  /** The accessible name, built by the caller from `CARD`. */
  readonly label = input.required<string>();
  readonly activate = output<void>();

  protected readonly copy = CARD;
  protected readonly specks = signal<Speck[]>([]);

  private readonly reducedMotion = mediaQuerySignal(REDUCED_MOTION_QUERY);
  private readonly palette = computed(() => cardPalette(this.card().colorIdentity));
  /** The border's conic gradient: the card's colors in turn, closing on the first. */
  protected readonly border = computed(() => {
    const stops = this.palette().stops;
    const ring = stops.length === 1 ? [stops[0], stops[0]] : [...stops, stops[0]];
    return `conic-gradient(from var(--spin-angle), ${ring.join(', ')})`;
  });

  /** One burst per pointer entry; none for touch, under reduced motion, or on keyboard focus. */
  protected burst(event: PointerEvent): void {
    if (this.reducedMotion() || event.pointerType === 'touch') {
      return;
    }
    const specks = makeSpecks(this.palette().stops, nextSpeck);
    nextSpeck += SPECKS;
    this.specks.set(specks);
  }

  protected speckEnded(id: number): void {
    this.specks.update((list) => list.filter((speck) => speck.id !== id));
  }
}

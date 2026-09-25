import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@models/profile.model';
import { COLOR_ORDER, IDENTITY_HEX } from '@utils/identity.util';

/** Dot top-left (left%, top%), clockwise from the top: W U B R G. */
const POSITION: Record<Color, [number, number]> = {
  W: [39, 2],
  U: [74.2, 27.6],
  B: [60.8, 68.9],
  R: [17.2, 68.9],
  G: [3.8, 27.6],
};

// The 36px display-only wheel used in profile list rows (DESIGN.md "Mini wheel"). Decorative:
// the row names the identity in text next to it.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-mini-wheel',
  template: `
    @for (dot of dots(); track dot.color) {
      <span
        class="dot"
        [class.on]="dot.on"
        [style.left.%]="dot.left"
        [style.top.%]="dot.top"
        [style.--hex]="dot.hex"
      ></span>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      flex: none;
      width: var(--wheel-mini);
      height: var(--wheel-mini);
    }

    .dot {
      position: absolute;
      width: 22%;
      height: 22%;
      border-radius: 50%;
      background: var(--hex);
      opacity: 0.18;

      &.on {
        opacity: 1;
        box-shadow: 0 0 6px var(--hex);
      }
    }
  `,
  host: { 'aria-hidden': 'true' },
})
export class MiniWheel {
  readonly colors = input.required<Color[]>();

  protected readonly dots = computed(() =>
    COLOR_ORDER.map((color) => ({
      color,
      on: this.colors().includes(color),
      left: POSITION[color][0],
      top: POSITION[color][1],
      hex: IDENTITY_HEX[color].base,
    })),
  );
}

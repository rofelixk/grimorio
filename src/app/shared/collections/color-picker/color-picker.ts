import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  COLLECTION_COLORS,
  colorOf,
  type CollectionColor,
  type CollectionColorHex,
} from '@models/collection.model';
import { COLLECTION } from '@utils/collection-copy';
import { RovingRadios } from '@shared/ds/roving-radios';

let nextId = 0;

/** The honeycomb rows: 5 / 6 / 5, in palette order. */
const ROWS: readonly (readonly CollectionColor[])[] = [
  COLLECTION_COLORS.slice(0, 5),
  COLLECTION_COLORS.slice(5, 11),
  COLLECTION_COLORS.slice(11),
];

// The collection color picker (DESIGN.md "Collections" → "Color picker"): a radiogroup of the 16
// palette swatches in a 5/6/5 honeycomb. Roving tabindex: one tab stop (the selected swatch);
// arrow keys move and select through the palette order, wrapping; Home/End jump to the ends.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-color-picker',
  imports: [RovingRadios],
  template: `
    <span class="label" [id]="labelId">
      {{ copy.colorWord }} · <span class="label-name">{{ selected().name }}</span>
    </span>
    <div
      class="grid"
      role="radiogroup"
      [attr.aria-labelledby]="labelId"
      [appRovingRadios]="index()"
      (radioMove)="valueChange.emit(colors[$event].hex)"
    >
      @for (row of rows; track $index) {
        <div class="row" [class.row--indented]="$index !== 1">
          @for (color of row; track color.hex) {
            <button
              type="button"
              class="swatch"
              role="radio"
              [class.selected]="color.hex === value()"
              [attr.aria-checked]="color.hex === value()"
              [attr.aria-label]="color.name"
              [attr.title]="color.name"
              [attr.tabindex]="color.hex === value() ? 0 : -1"
              [style.background]="color.hex"
              [style.--ring]="color.ring ?? color.hex"
              [style.--glow]="color.hex + '80'"
              (click)="valueChange.emit(color.hex)"
            ></button>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './color-picker.scss',
})
export class ColorPicker {
  readonly value = input.required<CollectionColorHex>();
  readonly valueChange = output<CollectionColorHex>();

  protected readonly copy = COLLECTION;
  protected readonly rows = ROWS;
  protected readonly colors = COLLECTION_COLORS;
  protected readonly labelId = `grm-color-label-${nextId++}`;
  protected readonly selected = computed(() => colorOf(this.value()));

  protected readonly index = computed(() => COLLECTION_COLORS.findIndex((color) => color.hex === this.value()));
}

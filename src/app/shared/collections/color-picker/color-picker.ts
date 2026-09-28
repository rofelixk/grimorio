import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChildren,
} from '@angular/core';
import {
  CARVAO_RING,
  COLLECTION_COLORS,
  colorOf,
  type CollectionColor,
  type CollectionColorId,
} from '@models/collection.model';
import { COLLECTION } from '@utils/collection-copy';

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
  template: `
    <span class="label" [id]="labelId">
      {{ copy.colorWord }} · <span class="label-name">{{ selected().name }}</span>
    </span>
    <div class="grid" role="radiogroup" [attr.aria-labelledby]="labelId">
      @for (row of rows; track $index) {
        <div class="row" [class.row--indented]="$index !== 1">
          @for (color of row; track color.id) {
            <button
              #swatch
              type="button"
              class="swatch"
              role="radio"
              [class.selected]="color.id === value()"
              [attr.aria-checked]="color.id === value()"
              [attr.aria-label]="color.name"
              [attr.title]="color.name"
              [attr.tabindex]="color.id === value() ? 0 : -1"
              [style.background]="color.hex"
              [style.--ring]="color.id === 'carvao' ? carvaoRing : color.hex"
              [style.--glow]="color.hex + '80'"
              (click)="valueChange.emit(color.id)"
              (keydown)="onKeydown($event)"
            ></button>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './color-picker.scss',
})
export class ColorPicker {
  readonly value = input.required<CollectionColorId>();
  readonly valueChange = output<CollectionColorId>();

  protected readonly copy = COLLECTION;
  protected readonly rows = ROWS;
  protected readonly carvaoRing = CARVAO_RING;
  protected readonly labelId = `grm-color-label-${nextId++}`;
  protected readonly selected = computed(() => colorOf(this.value()));

  private readonly swatches = viewChildren<ElementRef<HTMLButtonElement>>('swatch');

  protected onKeydown(event: KeyboardEvent): void {
    const last = COLLECTION_COLORS.length - 1;
    const current = COLLECTION_COLORS.findIndex((color) => color.id === this.value());
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = current === last ? 0 : current + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = current === 0 ? last : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.valueChange.emit(COLLECTION_COLORS[next].id);
    this.swatches()[next]?.nativeElement.focus();
  }
}

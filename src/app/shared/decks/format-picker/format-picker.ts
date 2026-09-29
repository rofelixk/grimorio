import { ChangeDetectionStrategy, Component, ElementRef, computed, model, viewChildren } from '@angular/core';
import { DECK_FORMATS, DEFAULT_FORMAT, type DeckFormatId } from '@models/deck.model';
import { DECK } from '@utils/deck-copy';

let nextId = 0;

// The deck format picker (DESIGN.md "Decks" → "Format picker"): a radiogroup of the 8 formats as
// text buttons, with the selected format's rules in a plate below — information only (FR-016).
// Roving tabindex: one tab stop (the selected format); arrow keys move and select, wrapping;
// Home/End jump to the ends.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-format-picker',
  template: `
    <span class="label" [id]="labelId">{{ label() }}</span>
    <div class="grid" role="radiogroup" [attr.aria-labelledby]="labelId">
      @for (id of formats; track id) {
        <button
          #option
          type="button"
          class="option"
          role="radio"
          [class.selected]="id === value()"
          [attr.aria-checked]="id === value()"
          [attr.tabindex]="id === value() ? 0 : -1"
          (click)="value.set(id)"
          (keydown)="onKeydown($event)"
        >
          {{ copy.formats[id].name }}
        </button>
      }
    </div>
    <ul class="plate rules" aria-live="polite">
      @for (rule of copy.formats[value()].rules; track rule) {
        <li>{{ rule }}</li>
      }
    </ul>
  `,
  styleUrl: './format-picker.scss',
})
export class FormatPicker {
  readonly value = model<DeckFormatId>(DEFAULT_FORMAT);

  protected readonly copy = DECK;
  protected readonly formats = DECK_FORMATS;
  protected readonly labelId = `grm-format-label-${nextId++}`;
  protected readonly label = computed(() => DECK.formatLabel(DECK.formats[this.value()].name));

  private readonly options = viewChildren<ElementRef<HTMLButtonElement>>('option');

  protected onKeydown(event: KeyboardEvent): void {
    const last = DECK_FORMATS.length - 1;
    const current = DECK_FORMATS.indexOf(this.value());
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
    this.value.set(DECK_FORMATS[next]);
    this.options()[next]?.nativeElement.focus();
  }
}

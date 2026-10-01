import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { DECK_FORMATS, DEFAULT_FORMAT, type DeckFormatId } from '@models/deck.model';
import { DECK } from '@utils/deck-copy';
import { RovingRadios } from '@shared/ds/roving-radios';

let nextId = 0;

// The deck format picker (DESIGN.md "Decks" → "Format picker"): a radiogroup of the 8 formats as
// text buttons, with the selected format's rules in a plate below — information only (FR-016).
// Roving tabindex: one tab stop (the selected format); arrow keys move and select, wrapping;
// Home/End jump to the ends.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-format-picker',
  imports: [RovingRadios],
  template: `
    <span class="label" [id]="labelId">{{ label() }}</span>
    <div
      class="grid"
      role="radiogroup"
      [attr.aria-labelledby]="labelId"
      [appRovingRadios]="index()"
      (radioMove)="value.set(formats[$event])"
    >
      @for (id of formats; track id) {
        <button
          type="button"
          class="option"
          role="radio"
          [class.selected]="id === value()"
          [attr.aria-checked]="id === value()"
          [attr.tabindex]="id === value() ? 0 : -1"
          (click)="value.set(id)"
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

  protected readonly index = computed(() => DECK_FORMATS.indexOf(this.value()));
}

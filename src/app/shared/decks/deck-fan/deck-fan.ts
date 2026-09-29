import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DECK } from '@utils/deck-copy';

// A deck as a fan of three sleeves (DESIGN.md "Decks" → "Deck fan"). The 320×392 stage renders at
// `scale` as one transform, inside a host box reserved at the scaled size so the grid measures it
// correctly. The tile sets `.is-lifted` on hover/focus to lift the front sleeve.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deck-fan',
  template: `
    <div class="stage">
      <div class="sleeve sleeve--back"></div>
      <div class="sleeve sleeve--middle"></div>
      <div class="sleeve sleeve--front">
        <!-- A featured card image goes here later, with object-fit: contain — whole, never cropped (FR-017). -->
        <div class="window window--placeholder">
          <span class="micro-label">{{ copy.featuredLabel }}</span>
          <span class="hint">{{ copy.featuredHint }}</span>
        </div>
      </div>
    </div>
  `,
  styleUrl: './deck-fan.scss',
  host: {
    'aria-hidden': 'true',
    '[style.--scale]': 'scale()',
  },
})
export class DeckFan {
  readonly scale = input(1);

  protected readonly copy = DECK;
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DECK } from '@utils/deck-copy';

// The deck area view (spec 009): one route/component instance for the deck list and a deck page,
// matched by `deckMatcher` (app.routes.ts) and fed `ref` via `withComponentInputBinding`.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deck-area',
  styleUrl: './deck-area.scss',
  templateUrl: './deck-area.html',
})
export class DeckArea {
  readonly ref = input<string>();

  protected readonly copy = DECK;
}

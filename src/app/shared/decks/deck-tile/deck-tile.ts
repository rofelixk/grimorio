import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type Deck, formatOf } from '@models/deck.model';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { DECK } from '@utils/deck-copy';
import { DeckFan } from '../deck-fan/deck-fan';

const NARROW_QUERY = '(max-width: 359px)';

// One deck in the list (DESIGN.md "Decks" → "Deck tile"): a single link to its page carrying
// `info.deckTurn`, so opening it turns the page (research R8). Fan and caption are aria-hidden in
// favor of the link's own name.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deck-tile',
  imports: [RouterLink, DeckFan],
  template: `
    <a
      class="tile"
      [routerLink]="['/decks', deck().id]"
      [info]="turnInfo"
      [attr.aria-label]="label()"
      (pointerenter)="hovered.set(true)"
      (pointerleave)="hovered.set(false)"
      (focus)="onFocus($event)"
      (blur)="focusVisible.set(false)"
    >
      <app-deck-fan [scale]="scale()" [class.is-lifted]="hovered() || focusVisible()" />
      <span class="caption" aria-hidden="true">
        <span class="name">{{ deck().name }}</span>
        <span class="format">{{ formatName() }}</span>
      </span>
    </a>
  `,
  styleUrl: './deck-tile.scss',
})
export class DeckTile {
  readonly deck = input.required<Deck>();

  private readonly mobile = mediaQuerySignal(MOBILE_QUERY);
  private readonly narrow = mediaQuerySignal(NARROW_QUERY);
  /** 0.75 on desktop, 1 on phone, 0.85 on the narrowest phones so the fan fits a 288px column. */
  protected readonly scale = computed(() => (this.narrow() ? 0.85 : this.mobile() ? 1 : 0.75));
  protected readonly turnInfo = { deckTurn: true };
  protected readonly hovered = signal(false);
  protected readonly focusVisible = signal(false);

  protected readonly formatName = computed(() => DECK.formats[formatOf(this.deck().format)].name);
  protected readonly label = computed(() => DECK.tileLabel(this.deck().name, this.formatName()));

  protected onFocus(event: FocusEvent): void {
    this.focusVisible.set((event.target as HTMLElement).matches(':focus-visible'));
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DeckService } from '@services/deck.service';
import { EntityList } from '@shared/entity-list/entity-list';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntityList],
  selector: 'app-deck-list',
  styleUrl: './deck-list.scss',
  templateUrl: './deck-list.html',
})
export class DeckList {
  private readonly deckService = inject(DeckService);

  readonly decks = this.deckService.decks;

  addDeck(name: string): void {
    this.deckService.add({ name, commander: null, cards: [] });
  }

  removeDeck(id: string): void {
    this.deckService.remove(id);
  }
}

import { Component, computed, inject, input, output } from '@angular/core';
import { DeckCard, DeckCardIdentity } from '../../core/models/deck.model';
import { CardService } from '../../core/services/card.service';
import { ColorIdentity } from '../color-identity/color-identity';

export type OwnershipStatus = 'owned' | 'not-owned' | 'removed';

export interface ResolvedDeckCard {
  id: string;
  identity: DeckCardIdentity | undefined;
  status: OwnershipStatus;
}

@Component({
  imports: [ColorIdentity],
  selector: 'app-deck-card-list',
  styleUrl: './deck-card-list.scss',
  templateUrl: './deck-card-list.html',
})
export class DeckCardList {
  private readonly cardService = inject(CardService);

  readonly cards = input.required<DeckCard[]>();
  readonly remove = output<string>();

  readonly rows = computed<ResolvedDeckCard[]>(() => this.cards().map((dc) => this.resolve(dc)));

  private resolve(dc: DeckCard): ResolvedDeckCard {
    if (dc.source === 'owned') {
      const entry = this.cardService.cards().find((c) => c.id === dc.cardEntryId);
      return { id: dc.id, identity: entry, status: entry ? 'owned' : 'removed' };
    }

    const owned = this.cardService.cards().some((c) => c.scryfallId === dc.card.scryfallId);
    return { id: dc.id, identity: dc.card, status: owned ? 'owned' : 'not-owned' };
  }

  removeCard(id: string): void {
    this.remove.emit(id);
  }
}

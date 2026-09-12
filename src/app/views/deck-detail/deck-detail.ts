import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeckCard, DeckCardIdentity } from '../../core/models/deck.model';
import { CardService } from '../../core/services/card.service';
import { DeckService } from '../../core/services/deck.service';
import { CardPicker } from '../../shared/card-picker/card-picker';
import { ColorIdentity } from '../../shared/color-identity/color-identity';
import { DeckCardList } from '../../shared/deck-card-list/deck-card-list';

const BASIC_LAND_NAMES = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']);

function isSubsetColorIdentity(card: DeckCardIdentity['colorIdentity'], commander: DeckCardIdentity['colorIdentity']): boolean {
  const commanderColors = new Set(commander);
  return card.every((color) => commanderColors.has(color));
}

@Component({
  imports: [RouterLink, CardPicker, ColorIdentity, DeckCardList],
  selector: 'app-deck-detail',
  styleUrl: './deck-detail.scss',
  templateUrl: './deck-detail.html',
})
export class DeckDetail {
  private readonly deckService = inject(DeckService);
  private readonly cardService = inject(CardService);

  readonly id = input.required<string>();

  readonly deck = computed(() => this.deckService.byId(this.id())());

  readonly commanderIdentity = computed<DeckCardIdentity | undefined>(() => {
    const deck = this.deck();
    if (!deck?.commander) {
      return undefined;
    }
    return this.resolveIdentity(deck.commander);
  });

  readonly isCommanderEligible = (card: DeckCardIdentity): boolean =>
    card.canBeCommander && card.commanderLegality === 'legal';

  readonly isAddable = (card: DeckCardIdentity): boolean => {
    const commander = this.commanderIdentity();
    const deck = this.deck();
    if (!commander || !deck) {
      return false;
    }
    if (card.commanderLegality !== 'legal') {
      return false;
    }
    if (!isSubsetColorIdentity(card.colorIdentity, commander.colorIdentity)) {
      return false;
    }
    if (BASIC_LAND_NAMES.has(card.name)) {
      return true;
    }
    const existingNames = new Set(
      deck.cards.map((dc) => this.resolveIdentity(dc)?.name).filter((name): name is string => !!name),
    );
    return !existingNames.has(card.name);
  };

  readonly legality = computed(() => {
    const deck = this.deck();
    if (!deck) {
      return null;
    }

    const commanderIdentity = this.commanderIdentity();
    const cardIdentities = deck.cards.map((dc) => this.resolveIdentity(dc)).filter((c): c is DeckCardIdentity => !!c);

    const totalCount = (deck.commander ? 1 : 0) + deck.cards.length;

    const nameCounts = new Map<string, number>();
    for (const card of cardIdentities) {
      if (BASIC_LAND_NAMES.has(card.name)) {
        continue;
      }
      nameCounts.set(card.name, (nameCounts.get(card.name) ?? 0) + 1);
    }
    const singletonViolations = [...nameCounts.entries()].filter(([, count]) => count > 1).map(([name]) => name);

    const nonLegalCards = cardIdentities.filter((c) => c.commanderLegality !== 'legal').map((c) => c.name);

    const colorIdentityViolations = commanderIdentity
      ? cardIdentities
          .filter((c) => !isSubsetColorIdentity(c.colorIdentity, commanderIdentity.colorIdentity))
          .map((c) => c.name)
      : [];

    const commanderEligible = commanderIdentity ? this.isCommanderEligible(commanderIdentity) : false;
    const commanderLegal = commanderIdentity ? commanderIdentity.commanderLegality === 'legal' : false;

    const isLegal =
      !!commanderIdentity &&
      totalCount === 100 &&
      singletonViolations.length === 0 &&
      nonLegalCards.length === 0 &&
      colorIdentityViolations.length === 0 &&
      commanderEligible &&
      commanderLegal;

    return {
      totalCount,
      singletonViolations,
      nonLegalCards,
      colorIdentityViolations,
      commanderEligible,
      commanderLegal,
      isLegal,
    };
  });

  private resolveIdentity(dc: DeckCard): DeckCardIdentity | undefined {
    return dc.source === 'owned' ? this.cardService.cards().find((c) => c.id === dc.cardEntryId) : dc.card;
  }

  setCommander(card: DeckCard): void {
    this.deckService.setCommander(this.id(), card);
  }

  clearCommander(): void {
    this.deckService.setCommander(this.id(), null);
  }

  addCard(card: DeckCard): void {
    this.deckService.addCard(this.id(), card);
  }

  removeCard(cardId: string): void {
    this.deckService.removeCard(this.id(), cardId);
  }
}

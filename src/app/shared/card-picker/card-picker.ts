import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CardService } from '../../core/services/card.service';
import { CardLookupResult, CardLookupService } from '../../core/services/card-lookup.service';
import { DeckCard, DeckCardIdentity } from '../../core/models/deck.model';

@Component({
  imports: [],
  selector: 'app-card-picker',
  styleUrl: './card-picker.scss',
  templateUrl: './card-picker.html',
})
export class CardPicker {
  private readonly cardService = inject(CardService);
  private readonly cardLookup = inject(CardLookupService);

  readonly filter = input.required<(card: DeckCardIdentity) => boolean>();
  readonly picked = output<DeckCard>();

  readonly mode = signal<'collection' | 'freeBuild'>('collection');

  // Collection mode
  readonly search = signal('');
  readonly matchingOwnedCards = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.cardService
      .cards()
      .filter((card) => this.filter()(card))
      .filter((card) => !query || card.name.toLowerCase().includes(query));
  });

  pickOwned(cardEntryId: string): void {
    this.picked.emit({ id: cardEntryId, source: 'owned', cardEntryId });
  }

  // Free-build mode
  readonly setCode = signal('');
  readonly collectorNumber = signal('');
  readonly generating = signal(false);
  readonly lookupError = signal<string | null>(null);
  readonly generated = signal<CardLookupResult | null>(null);

  readonly generatedIdentity = computed<DeckCardIdentity | null>(() => {
    const result = this.generated();
    if (!result) {
      return null;
    }
    return {
      ...result,
      setCode: this.setCode().trim().toUpperCase(),
      collectorNumber: this.collectorNumber().trim(),
      finish: 'nonfoil',
    };
  });

  readonly generatedPassesFilter = computed(() => {
    const identity = this.generatedIdentity();
    return identity !== null && this.filter()(identity);
  });

  async generate(): Promise<void> {
    const setCode = this.setCode().trim();
    const collectorNumber = this.collectorNumber().trim();
    if (!setCode || !collectorNumber) {
      this.lookupError.set('Enter a set code and collector number first.');
      return;
    }

    this.generating.set(true);
    this.lookupError.set(null);
    try {
      const result = await this.cardLookup.lookup(setCode, collectorNumber);
      this.generated.set(result);
    } catch {
      this.lookupError.set('Could not look up that card. Please try again.');
    } finally {
      this.generating.set(false);
    }
  }

  pickFreeBuild(): void {
    const identity = this.generatedIdentity();
    if (!identity || !this.generatedPassesFilter()) {
      return;
    }

    this.picked.emit({ id: crypto.randomUUID(), source: 'freeBuild', card: identity });
    this.resetFreeBuild();
  }

  private resetFreeBuild(): void {
    this.setCode.set('');
    this.collectorNumber.set('');
    this.generated.set(null);
    this.lookupError.set(null);
  }
}

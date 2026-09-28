import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DeckService } from '@services/deck.service';
import { IdentityService } from '@services/identity.service';
import { CompactModal } from '@shared/ds/compact-modal/compact-modal';
import { DECK } from '@utils/deck-copy';

let nextId = 0;

export interface DeckDeleted {
  name: string;
  cards: number;
}

// The delete deck dialog (ui.md §2, DESIGN.md "Decks"), inside the compact modal. There is no
// choice: a deck's cards always go to the holding box (FR-009). While `remove()` runs the dialog is
// locked (FR-008). Name and count are captured on open, so the copy and the toast payload survive
// the deck leaving the signal mid-delete.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deck-delete-dialog',
  imports: [CompactModal],
  templateUrl: './deck-delete-dialog.html',
  styleUrl: './deck-delete-dialog.scss',
})
export class DeckDeleteDialog implements OnInit {
  readonly deckId = input.required<string>();
  readonly closed = output<void>();
  readonly deleted = output<DeckDeleted>();

  private readonly decks = inject(DeckService);
  protected readonly roles = inject(IdentityService).roles;
  protected readonly copy = DECK;

  private readonly uid = nextId++;
  protected readonly titleId = `grm-deck-delete-title-${this.uid}`;

  protected readonly snapshot = signal<DeckDeleted>({ name: '', cards: 0 });
  protected readonly busy = signal(false);

  protected readonly body = computed(() => {
    const { cards } = this.snapshot();
    return cards > 0 ? DECK.deleteWithCards(cards) : DECK.deleteNoCards;
  });
  protected readonly verb = computed(() => (this.busy() ? DECK.deleting : DECK.deleteVerb));

  ngOnInit(): void {
    const id = this.deckId();
    this.snapshot.set({ name: this.decks.byId().get(id)?.name ?? '', cards: this.decks.cardCount(id) });
  }

  protected cancel(): void {
    if (!this.busy()) this.closed.emit();
  }

  protected async confirm(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const { cards } = await this.decks.remove(this.deckId());
      this.deleted.emit({ name: this.snapshot().name, cards });
    } catch {
      this.busy.set(false);
    }
  }
}

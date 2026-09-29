import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { MAX_NAME } from '@models/collection.model';
import { DEFAULT_FORMAT, type Deck, type DeckFormatId, type DeckNameError } from '@models/deck.model';
import { DeckService } from '@services/deck.service';
import { IdentityService } from '@services/identity.service';
import { CompactModal } from '@shared/ds/compact-modal/compact-modal';
import { DECK } from '@utils/deck-copy';
import { FormatPicker } from '../format-picker/format-picker';

let nextId = 0;

const ERRORS: Record<DeckNameError, string> = {
  empty: DECK.errEmpty,
  'too-long': DECK.errLong,
  taken: DECK.errTaken,
};

// The create/edit deck dialog (ui.md §2, DESIGN.md "Decks"), inside the compact modal. A new deck
// comes with Commander preselected, so creating one takes only a name (FR-003). Validation runs on
// submit through DeckService; the error replaces the helper and clears on the next input.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deck-form-dialog',
  imports: [CompactModal, FormatPicker],
  templateUrl: './deck-form-dialog.html',
  styleUrl: './deck-form-dialog.scss',
})
export class DeckFormDialog {
  readonly mode = input.required<'create' | 'edit'>();
  readonly deckId = input<string>();
  readonly closed = output<void>();
  readonly saved = output<Deck>();

  private readonly decks = inject(DeckService);
  protected readonly roles = inject(IdentityService).roles;
  protected readonly copy = DECK;
  protected readonly maxName = MAX_NAME;

  private readonly uid = nextId++;
  protected readonly titleId = `grm-deck-form-title-${this.uid}`;
  protected readonly inputId = `grm-deck-form-name-${this.uid}`;
  protected readonly hintId = `grm-deck-form-hint-${this.uid}`;
  protected readonly counterId = `grm-deck-form-counter-${this.uid}`;

  private readonly editing = computed(() => {
    const id = this.deckId();
    return this.mode() === 'edit' && id ? this.decks.byId().get(id) : undefined;
  });

  protected readonly name = linkedSignal(() => this.editing()?.name ?? '');
  protected readonly format = linkedSignal<DeckFormatId>(() => this.editing()?.format ?? DEFAULT_FORMAT);
  protected readonly error = signal<DeckNameError | null>(null);
  protected readonly errorText = computed(() => {
    const error = this.error();
    return error ? ERRORS[error] : '';
  });

  protected readonly title = computed(() => (this.mode() === 'edit' ? DECK.formTitles.edit : DECK.formTitles.create));
  protected readonly verb = computed(() => (this.mode() === 'edit' ? DECK.verbs.save : DECK.verbs.create));

  protected onInput(value: string): void {
    this.name.set(value);
    this.error.set(null);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.mode() === 'edit') {
      const id = this.deckId()!;
      const result = this.decks.update(id, { name: this.name(), format: this.format() });
      if (result.ok) {
        this.saved.emit(this.decks.byId().get(id)!);
      } else if (result.error === 'not-found') {
        this.closed.emit();
      } else {
        this.error.set(result.error);
      }
      return;
    }

    const result = this.decks.create({ name: this.name(), format: this.format() });
    if (result.ok) {
      this.saved.emit(result.deck);
    } else {
      this.error.set(result.error);
    }
  }
}

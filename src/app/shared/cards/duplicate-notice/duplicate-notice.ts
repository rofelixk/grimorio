import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import type { Collection } from '@models/collection.model';
import type { CardDraft } from '@shared/cards/card-modal/card-modal';
import { CompactModal } from '@shared/ds/compact-modal/compact-modal';
import { RovingRadios } from '@shared/ds/roving-radios';
import { SelectList, SelectOption, SelectTrigger } from '@shared/ds/select-list/select-list';
import { cardPalette } from '@utils/card-colors.util';
import { CARD } from '@utils/card-copy';
import { detailsLine, type CardMatch } from '@utils/card-entry.util';

export type DuplicateChoice = 'merge' | 'separate' | 'keep';

export interface DuplicateDecision {
  choice: DuplicateChoice;
  match: CardMatch;
}

type Radio = 'merge' | 'other';

const RADIOS: readonly Radio[] = ['merge', 'other'];

let nextId = 0;

// The duplicate notice (ui.md §2.6, FR-015/FR-019): the card being saved matches a row the person
// already owns. One match shows that row (D1a); two or more list them in "Onde ela está" (D1b).
// "Somar" is preselected; the other option adds a separate row (add) or keeps both rows (edit).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-duplicate-notice',
  imports: [CompactModal, RovingRadios, SelectList, SelectTrigger, SelectOption],
  templateUrl: './duplicate-notice.html',
  styleUrl: './duplicate-notice.scss',
})
export class DuplicateNotice {
  readonly mode = input.required<'add' | 'edit'>();
  readonly draft = input.required<CardDraft>();
  readonly matches = input.required<readonly CardMatch[]>();
  readonly destination = input.required<Collection>();
  readonly decide = output<DuplicateDecision>();
  readonly closed = output<void>();

  protected readonly copy = CARD;
  private readonly uid = nextId++;
  protected readonly titleId = `grm-duplicate-title-${this.uid}`;
  protected readonly subtitleId = `grm-duplicate-subtitle-${this.uid}`;
  protected readonly matchKey = (match: CardMatch) => match.card.id;

  protected readonly roles = computed(() => cardPalette(this.draft().colorIdentity).roles);
  protected readonly many = computed(() => this.matches().length > 1);
  protected readonly match = linkedSignal(() => this.matches()[0]);
  protected readonly radio = signal<Radio>('merge');
  protected readonly radioIndex = computed(() => RADIOS.indexOf(this.radio()));

  protected readonly title = computed(() => (this.many() ? CARD.dupTitleMany(this.matches().length) : CARD.dupTitle));
  protected readonly subtitle = computed(() => {
    const edit = this.mode() === 'edit';
    if (this.many()) {
      return edit ? CARD.dupSubEditMany : CARD.dupSubMany;
    }
    const name = this.matches()[0].collection.name;
    return edit ? CARD.dupSubEdit(name) : CARD.dupSub(name);
  });
  protected readonly mergeSub = computed(() => {
    const n = this.match().card.quantity;
    const q = this.draft().quantity;
    return this.mode() === 'edit' ? CARD.mergeSubEdit(n, q) : CARD.mergeSub(n, q);
  });
  protected readonly otherTitle = computed(() => (this.mode() === 'edit' ? CARD.keep : CARD.separate));
  protected readonly otherSub = computed(() => {
    if (this.mode() === 'edit') {
      return null;
    }
    const name = this.destination().name;
    return this.many() ? CARD.separateSubMany(name) : CARD.separateSub(name);
  });
  protected readonly draftLine = computed(() => detailsLine(this.draft()));
  protected readonly matchLine = computed(() => detailsLine(this.match().card));

  protected pickIndex(index: number): void {
    this.radio.set(RADIOS[index]);
  }

  protected confirm(): void {
    const other: DuplicateChoice = this.mode() === 'edit' ? 'keep' : 'separate';
    this.decide.emit({ choice: this.radio() === 'merge' ? 'merge' : other, match: this.match() });
  }
}

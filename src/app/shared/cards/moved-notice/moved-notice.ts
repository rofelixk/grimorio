import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CardEntry } from '@models/card.model';
import type { Collection } from '@models/collection.model';
import { CompactModal } from '@shared/ds/compact-modal/compact-modal';
import { rolesFromHex } from '@utils/card-colors.util';
import { CARD } from '@utils/card-copy';
import { detailsLine } from '@utils/card-entry.util';

let nextId = 0;

// "Carta adicionada em outra coleção" (ui.md §2.7, FR-017): the collection the person was adding
// to gained subcollections meanwhile, so the card went to the first one. Locked: only "Ok" closes it.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-moved-notice',
  imports: [CompactModal],
  templateUrl: './moved-notice.html',
  styleUrl: './moved-notice.scss',
})
export class MovedNotice {
  readonly card = input.required<CardEntry>();
  readonly from = input.required<Collection>();
  readonly to = input.required<Collection>();
  readonly closed = output<void>();

  protected readonly copy = CARD;
  protected readonly titleId = `grm-moved-notice-title-${nextId++}`;
  protected readonly roles = computed(() => rolesFromHex(this.to().color));
  protected readonly details = computed(() => detailsLine(this.card()));
}

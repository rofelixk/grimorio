import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CollectionService } from '@services/collection.service';
import { IdentityService } from '@services/identity.service';
import { CompactModal } from '@shared/ds/compact-modal/compact-modal';
import { RovingRadios } from '@shared/ds/roving-radios';
import { COLLECTION } from '@utils/collection-copy';

let nextId = 0;

export type DeleteChoice = 'move' | 'delete';

const CHOICES: readonly DeleteChoice[] = ['move', 'delete'];

export interface CollectionDeleted {
  parentId: string | null;
  name: string;
  choice: DeleteChoice;
  result: { collections: number; cards: number };
}

interface Snapshot {
  name: string;
  parentId: string | null;
  cards: number;
  subs: number;
}

// The delete dialog (ui.md §2, DESIGN.md "Collections" → "Delete radios"), inside the compact
// modal. When the subtree holds cards the person must choose what happens to them — nothing is
// preselected, and confirm stays aria-disabled until they do (FR-013). While `remove()` runs the
// dialog is locked (FR-031). Name, parent and counts are captured on open, so the copy and the
// toast payload survive the collection leaving the signal mid-delete.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-collection-delete-dialog',
  imports: [CompactModal, RovingRadios],
  templateUrl: './collection-delete-dialog.html',
  styleUrl: './collection-delete-dialog.scss',
})
export class CollectionDeleteDialog implements OnInit {
  readonly collectionId = input.required<string>();
  readonly closed = output<void>();
  readonly deleted = output<CollectionDeleted>();

  private readonly collections = inject(CollectionService);
  protected readonly roles = inject(IdentityService).roles;
  protected readonly copy = COLLECTION;

  private readonly uid = nextId++;
  protected readonly titleId = `grm-collection-delete-title-${this.uid}`;
  protected readonly subtitleId = `grm-collection-delete-subtitle-${this.uid}`;

  protected readonly snapshot = signal<Snapshot>({ name: '', parentId: null, cards: 0, subs: 0 });
  protected readonly choice = signal<DeleteChoice | null>(null);
  /** The radio order; −1 while nothing is chosen. */
  protected readonly choiceIndex = computed(() => {
    const choice = this.choice();
    return choice ? CHOICES.indexOf(choice) : -1;
  });
  protected readonly busy = signal(false);

  protected readonly subtitle = computed(() => {
    const { cards, subs } = this.snapshot();
    if (cards > 0) {
      return subs > 0 ? `${COLLECTION.deleteSubsGo(subs)} ${COLLECTION.deleteWithCards(cards)}` : COLLECTION.deleteWithCards(cards);
    }
    return `${COLLECTION.deleteNoCards} ${subs > 0 ? COLLECTION.deleteSubsGo(subs) : COLLECTION.nothingElse}`;
  });
  protected readonly blocked = computed(() => this.busy() || (this.snapshot().cards > 0 && this.choice() === null));
  protected readonly verb = computed(() => {
    if (this.busy()) return COLLECTION.deleting;
    return this.snapshot().parentId !== null
      ? COLLECTION.deleteVerbs.deleteSubcollection
      : COLLECTION.deleteVerbs.deleteCollection;
  });

  ngOnInit(): void {
    const id = this.collectionId();
    const collection = this.collections.byId().get(id);
    const totals = this.collections.stats().byId.get(id);
    this.snapshot.set({
      name: collection?.name ?? '',
      parentId: collection?.parentId ?? null,
      cards: totals?.cards ?? 0,
      subs: totals?.subs ?? 0,
    });
  }

  protected pick(choice: DeleteChoice): void {
    if (!this.busy()) this.choice.set(choice);
  }

  protected pickIndex(index: number): void {
    this.pick(CHOICES[index]);
  }

  protected cancel(): void {
    if (!this.busy()) this.closed.emit();
  }

  protected async confirm(): Promise<void> {
    if (this.blocked()) return;
    const { name, parentId, cards } = this.snapshot();
    // With no cards there is nothing to choose: nothing is written for cards either way.
    const choice = cards > 0 ? this.choice()! : 'move';
    this.busy.set(true);
    try {
      const result = await this.collections.remove(this.collectionId(), choice);
      this.deleted.emit({ parentId, name, choice, result });
    } catch {
      this.busy.set(false);
    }
  }
}

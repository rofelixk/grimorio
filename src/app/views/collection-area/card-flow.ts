import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import type { CardEntry } from '@models/card.model';
import type { CatalogCard } from '@models/catalog.model';
import type { Collection } from '@models/collection.model';
import { CardService } from '@services/card.service';
import { CollectionService } from '@services/collection.service';
import { ToastService } from '@services/toast.service';
import type { CardDraft } from '@shared/cards/card-modal/card-modal';
import { CARD } from '@utils/card-copy';
import { firstLeaf } from '@utils/collection-tree.util';

export type CardFlowStep =
  | { kind: 'idle' }
  | { kind: 'search'; collectionId: string }
  | { kind: 'add'; collectionId: string; card: CatalogCard }
  | { kind: 'edit'; collectionId: string; cardId: string }
  | { kind: 'moved'; card: CardEntry; from: Collection; to: Collection; again: boolean };

// The add-a-card flow of the collection area (ui.md §4, contracts/services.md "CardFlow"): search →
// card modal → write → toast, with the moved notice when the collection gained subcollections
// meanwhile. Provided by `CollectionArea`, so its state dies with the view. The search modal stays
// mounted while `step` is `add` or `moved` (the view mounts it for all three). No flow starts a sync.
@Injectable()
export class CardFlow {
  private readonly cards = inject(CardService);
  private readonly collections = inject(CollectionService);
  private readonly toasts = inject(ToastService);

  private readonly stepSignal = signal<CardFlowStep>({ kind: 'idle' });
  readonly step = this.stepSignal.asReadonly();

  /** The name of the collection the flow was opened on, kept for the toast once it is gone. */
  private openedName = '';

  constructor() {
    // The collection the flow works on left the signals (a sync, another tab): nothing is saved.
    effect(() => {
      const step = this.stepSignal();
      const byId = this.collections.byId();
      if ((step.kind === 'search' || step.kind === 'add') && !byId.has(step.collectionId)) {
        untracked(() => {
          this.stepSignal.set({ kind: 'idle' });
          this.toasts.show(CARD.nothingSavedLabel, CARD.goneCollection(this.openedName));
        });
      }
    });
  }

  openSearch(collectionId: string): void {
    this.openedName = this.collections.byId().get(collectionId)?.name ?? '';
    this.stepSignal.set({ kind: 'search', collectionId });
  }

  /** A search result was chosen; the search stays underneath. */
  pick(card: CatalogCard): void {
    const step = this.stepSignal();
    if (step.kind === 'search') {
      this.stepSignal.set({ kind: 'add', collectionId: step.collectionId, card });
    }
  }

  /** The card modal was cancelled: back to the search with its state kept. */
  cancel(): void {
    const step = this.stepSignal();
    if (step.kind === 'add') {
      this.stepSignal.set({ kind: 'search', collectionId: step.collectionId });
    }
  }

  /** The search modal was closed. */
  close(): void {
    if (this.stepSignal().kind === 'search') {
      this.stepSignal.set({ kind: 'idle' });
    }
  }

  /** Saves the card in the opened collection, or in its first leaf if subcollections appeared. */
  save(draft: CardDraft, again: boolean): void {
    const step = this.stepSignal();
    if (step.kind !== 'add') {
      return;
    }
    const opened = this.collections.byId().get(step.collectionId);
    if (!opened) {
      return;
    }
    const destinationId = firstLeaf(opened.id, this.collections.childrenOf());
    const destination = this.collections.byId().get(destinationId) ?? opened;
    const { canBeCommander, ...rest } = draft;
    const added = this.cards.add({ ...rest, canBeCommander: canBeCommander ?? false, locationId: destination.id });

    if (destination.id !== opened.id) {
      this.stepSignal.set({ kind: 'moved', card: added, from: opened, to: destination, again });
      return;
    }
    this.toasts.show(CARD.addedLabel, CARD.added(added.name, added.quantity, destination.name));
    this.stepSignal.set(again ? { kind: 'search', collectionId: opened.id } : { kind: 'idle' });
  }

  /** "Ok" on the moved notice: continues where the save was headed. */
  dismissMoved(): void {
    const step = this.stepSignal();
    if (step.kind === 'moved') {
      this.stepSignal.set(step.again ? { kind: 'search', collectionId: step.from.id } : { kind: 'idle' });
    }
  }
}

import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import type { CardEntry } from '@models/card.model';
import type { CatalogCard } from '@models/catalog.model';
import type { Collection } from '@models/collection.model';
import { CardService } from '@services/card.service';
import { CollectionService } from '@services/collection.service';
import { ToastService } from '@services/toast.service';
import type { CardDraft } from '@shared/cards/card-modal/card-modal';
import type { DuplicateChoice } from '@shared/cards/duplicate-notice/duplicate-notice';
import { CARD } from '@utils/card-copy';
import { findMatches, matchKey, type CardMatch } from '@utils/card-entry.util';
import { firstLeaf } from '@utils/collection-tree.util';

export type CardFlowStep =
  | { kind: 'idle' }
  | { kind: 'search'; collectionId: string }
  | { kind: 'add'; collectionId: string; card: CatalogCard }
  | { kind: 'edit'; collectionId: string; cardId: string }
  | {
      kind: 'duplicate';
      mode: 'add';
      collectionId: string;
      card: CatalogCard;
      draft: CardDraft;
      matches: CardMatch[];
      /** Where a separate row would go, for the notice's copy; the write resolves it again. */
      destination: Collection;
      again: boolean;
    }
  | { kind: 'moved'; card: CardEntry; from: Collection; to: Collection; again: boolean };

// The add-a-card flow of the collection area (ui.md §4, contracts/services.md "CardFlow"): search →
// card modal → (duplicate notice) → write → toast, with the moved notice when the collection gained
// subcollections meanwhile. Provided by `CollectionArea`, so its state dies with the view. The search
// modal stays mounted under every later step, and the card modal under the duplicate notice, so
// cancelling either returns to it with its state kept. No flow starts a sync.
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
      if ((step.kind === 'search' || step.kind === 'add' || step.kind === 'duplicate') && !byId.has(step.collectionId)) {
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

  /** Cancel on the top modal: the card modal goes back to the search, the notice to the card modal. */
  cancel(): void {
    const step = this.stepSignal();
    if (step.kind === 'add') {
      this.stepSignal.set({ kind: 'search', collectionId: step.collectionId });
    } else if (step.kind === 'duplicate') {
      this.stepSignal.set({ kind: 'add', collectionId: step.collectionId, card: step.card });
    }
  }

  /** The search modal was closed. */
  close(): void {
    if (this.stepSignal().kind === 'search') {
      this.stepSignal.set({ kind: 'idle' });
    }
  }

  /**
   * Saves the card in the opened collection, or in its first leaf if subcollections appeared. A
   * match with a row the person already owns opens the duplicate notice first, with nothing saved.
   */
  save(draft: CardDraft, again: boolean): void {
    const step = this.stepSignal();
    if (step.kind !== 'add') {
      return;
    }
    const opened = this.collections.byId().get(step.collectionId);
    if (!opened) {
      return;
    }
    const destination = this.destinationOf(opened);
    const matches = findMatches(
      this.cards.cards(),
      matchKey(draft),
      this.collections.byId(),
      destination.id,
      (id) => this.collections.path(id).map((c) => c.name).join(' / '),
    );
    if (matches.length > 0) {
      this.stepSignal.set({
        kind: 'duplicate',
        mode: 'add',
        collectionId: opened.id,
        card: step.card,
        draft,
        matches,
        destination,
        again,
      });
      return;
    }
    this.write(opened, draft, again);
  }

  /**
   * The duplicate notice's "Continuar". A merge grows the chosen row; if that row left meanwhile (a
   * sync, another tab), the card is still recorded, as a new row.
   */
  decide(choice: DuplicateChoice, match: CardMatch): void {
    const step = this.stepSignal();
    if (step.kind !== 'duplicate') {
      return;
    }
    const opened = this.collections.byId().get(step.collectionId);
    if (!opened) {
      return;
    }
    const target = this.cards.cards().find((card) => card.id === match.card.id);
    if (choice === 'merge' && target) {
      this.cards.mergeInto(target.id, step.draft.quantity);
      const where = this.collections.byId().get(target.locationId)?.name ?? match.collection.name;
      this.toasts.show(CARD.addedLabel, CARD.added(step.draft.name, step.draft.quantity, where));
      this.stepSignal.set(step.again ? { kind: 'search', collectionId: opened.id } : { kind: 'idle' });
      return;
    }
    this.write(opened, step.draft, step.again);
  }

  private destinationOf(opened: Collection): Collection {
    const id = firstLeaf(opened.id, this.collections.childrenOf());
    return this.collections.byId().get(id) ?? opened;
  }

  /** Adds the card as a new row in the destination (re-resolved now), then the toast or moved notice. */
  private write(opened: Collection, draft: CardDraft, again: boolean): void {
    const destination = this.destinationOf(opened);
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

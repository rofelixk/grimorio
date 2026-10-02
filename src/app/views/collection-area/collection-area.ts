import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HOLDING_REF, MAX_DEPTH, colorOf, type Collection } from '@models/collection.model';
import { CardService } from '@services/card.service';
import { CardViewModeService } from '@services/card-view-mode.service';
import { CollectionService } from '@services/collection.service';
import { ShellState } from '@services/shell-state.service';
import { ToastService } from '@services/toast.service';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { CardGrid } from '@shared/cards/card-grid/card-grid';
import { CardViewToggle } from '@shared/cards/card-view-toggle/card-view-toggle';
import {
  CollectionDeleteDialog,
  type CollectionDeleted,
} from '@shared/collections/collection-delete-dialog/collection-delete-dialog';
import { CollectionFormDialog } from '@shared/collections/collection-form-dialog/collection-form-dialog';
import { CollectionRow } from '@shared/collections/collection-row/collection-row';
import { CreateRow } from '@shared/collections/create-row/create-row';
import { injectPageChange, retained } from '@shared/effects/page-sweep/page-change';
import { PagePlace } from '@shared/effects/page-sweep/page-place';
import { PageSweep } from '@shared/effects/page-sweep/page-sweep';
import { CARD } from '@utils/card-copy';
import { COLLECTION, formatCount } from '@utils/collection-copy';
import { type CollectionPlace, COLLECTION_PAGES } from '@utils/collection-pages.util';
import { subtreeIds } from '@utils/collection-tree.util';
import { NO_SWEEP_INFO } from '@utils/page-change.util';

const collectionId = (place: CollectionPlace | null) => (place?.kind === 'collection' ? place.id : null);

// The collection area view (spec 008): one route/component instance for the list, a collection
// page and the holding box, matched by `collectionMatcher` (app.routes.ts) and fed `ref` via
// `withComponentInputBinding`. The routed place drives the shared page change
// (`COLLECTION_PAGES`); `<app-page-sweep>` renders its shown place, plus — while a sweep runs —
// the leaving place over it, dissolving behind the dust's front.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-collection-area',
  imports: [
    CardGrid,
    CardViewToggle,
    CollectionDeleteDialog,
    CollectionFormDialog,
    CollectionRow,
    CreateRow,
    NgTemplateOutlet,
    PagePlace,
    PageSweep,
    RouterLink,
  ],
  styleUrl: './collection-area.scss',
  templateUrl: './collection-area.html',
})
export class CollectionArea {
  readonly ref = input<string>();

  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  protected readonly collections = inject(CollectionService);
  protected readonly wide = inject(ShellState).wide;
  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);

  private readonly cardService = inject(CardService);
  protected readonly viewMode = inject(CardViewModeService);

  protected readonly copy = COLLECTION;
  protected readonly card = CARD;
  protected readonly formatCount = formatCount;
  protected readonly maxDepth = MAX_DEPTH;

  /** The place the address asks for (FR-006), with the collection's depth when it was routed. */
  protected readonly routed = computed<CollectionPlace>(
    () => {
      const ref = this.ref();
      if (!ref) return { kind: 'list' };
      if (ref === HOLDING_REF) return { kind: 'holding' };
      return { kind: 'collection', id: ref, depth: this.collections.depth(ref) };
    },
    { equal: COLLECTION_PAGES.same },
  );

  /** The address names a collection that isn't there, or an empty holding box. */
  private readonly missing = computed(() => {
    const place = this.routed();
    if (place.kind === 'collection') return !this.collections.byId().has(place.id);
    if (place.kind === 'holding') return this.collections.stats().holding.cards === 0;
    return false;
  });

  /** The open create/edit dialog, if any; the person stays on the current page after it. */
  protected readonly form = signal<{ mode: 'create' | 'edit'; parentId: string | null; collectionId?: string } | null>(
    null,
  );

  /** The open delete dialog, with the subtree and parent recorded when it opened. */
  protected readonly del = signal<{ id: string; parentId: string | null; subtree: ReadonlySet<string> } | null>(null);

  /** A missing place is left to the redirect below, so the page never sweeps into nothing. */
  protected readonly pages = injectPageChange<CollectionPlace>({
    ...COLLECTION_PAGES,
    target: () => (this.missing() ? null : this.routed()),
  });

  protected readonly topLevel = computed(() => this.collections.childrenOf().get(null) ?? []);
  protected readonly stats = this.collections.stats;
  protected readonly empty = computed(() => this.topLevel().length === 0 && this.stats().holding.cards === 0);

  /**
   * The collection page's data on the shown and on the leaving page, derived once per change of
   * its inputs. Each keeps its last value once the collection is gone, so a page removed while it
   * dissolves stays whole.
   */
  protected readonly shownPage = retained(() => collectionId(this.pages.shown()), (id) => this.pageOf(id));
  protected readonly leavingPage = retained(() => collectionId(this.pages.leaving()), (id) => this.pageOf(id));

  /** Children carry their own totals, so a retained page never reads a removed child's live stats. */
  private pageOf(id: string) {
    const collection = this.collections.byId().get(id);
    if (!collection) return undefined;
    const stats = this.stats();
    return {
      collection,
      color: colorOf(collection.color),
      ancestors: this.collections.path(id).slice(0, -1),
      depth: this.collections.depth(id),
      kind: this.collections.kind(id),
      cards: this.cardService.byLocation().get(id) ?? [],
      totals: stats.byId.get(id) || { cards: 0, sale: 0, subs: 0, directEntries: 0 },
      children: (this.collections.childrenOf().get(id) ?? []).map((child) => ({
        collection: child,
        totals: stats.byId.get(child.id)!,
      })),
    };
  }

  constructor() {
    // Unknown ids (another profile's, removed by a sync) and an empty holding box go back to the
    // list (FR-006). A page inside a subtree being deleted here goes to the deleted collection's
    // parent instead, as soon as it leaves the signal — before remove() even resolves (R8).
    effect(() => {
      if (!this.missing()) return;
      const place = this.routed();
      untracked(() => {
        const del = this.del();
        const inDeleted = place.kind === 'collection' && del?.subtree.has(place.id) && del.parentId;
        void this.router.navigate(inDeleted ? ['/collection', del!.parentId] : ['/collection'], {
          replaceUrl: true,
          info: NO_SWEEP_INFO,
        });
      });
    });
  }

  protected openCollection(id: string): void {
    void this.router.navigate(['/collection', id]);
  }

  protected openHolding(): void {
    void this.router.navigate(['/collection', HOLDING_REF]);
  }

  protected openCreate(parentId: string | null): void {
    this.form.set({ mode: 'create', parentId });
  }

  protected openEdit(collectionId: string): void {
    this.form.set({ mode: 'edit', parentId: null, collectionId });
  }

  protected openDelete(collection: Collection): void {
    const subtree = new Set(subtreeIds(collection.id, this.collections.childrenOf()));
    this.del.set({ id: collection.id, parentId: collection.parentId, subtree });
  }

  protected onDeleted({ name, choice, result }: CollectionDeleted): void {
    this.del.set(null);
    const text =
      result.cards === 0
        ? COLLECTION.toastEmpty(name)
        : choice === 'move'
          ? COLLECTION.toastMoved(name, result.cards)
          : COLLECTION.toastDeleted(name, result.cards);
    this.toasts.show(COLLECTION.toastLabel, text);
  }
}

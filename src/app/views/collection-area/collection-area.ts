import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HOLDING_REF, MAX_DEPTH, colorOf, type Collection } from '@models/collection.model';
import { CollectionService } from '@services/collection.service';
import { ShellState } from '@services/shell-state.service';
import { ToastService } from '@services/toast.service';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import {
  CollectionDeleteDialog,
  type CollectionDeleted,
} from '@shared/collections/collection-delete-dialog/collection-delete-dialog';
import { CollectionFormDialog } from '@shared/collections/collection-form-dialog/collection-form-dialog';
import { CollectionRow } from '@shared/collections/collection-row/collection-row';
import { CreateRow } from '@shared/collections/create-row/create-row';
import { PageSweep } from '@shared/effects/page-sweep/page-sweep';
import { COLLECTION, formatCount } from '@utils/collection-copy';
import { subtreeIds } from '@utils/collection-tree.util';
import type { Place } from '@utils/collection-transition.util';
import { CollectionTransition } from './collection-transition';

function samePlace(a: Place, b: Place): boolean {
  return a.kind === b.kind && (a.kind !== 'collection' || a.id === (b as { id: string }).id);
}

// The collection area view (spec 008): one route/component instance for the list, a collection
// page and the holding box, matched by `collectionMatcher` (app.routes.ts) and fed `ref` via
// `withComponentInputBinding`. The routed place drives `CollectionTransition`; the template
// renders its `shown()` place, plus — while a change runs — the outgoing place over it, dissolving
// behind the dust's front.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-collection-area',
  imports: [CollectionDeleteDialog, CollectionFormDialog, CollectionRow, CreateRow, NgTemplateOutlet, RouterLink],
  providers: [CollectionTransition, PageSweep],
  styleUrl: './collection-area.scss',
  templateUrl: './collection-area.html',
  host: {
    '[attr.inert]': "transition.turning() ? '' : null",
  },
})
export class CollectionArea {
  readonly ref = input<string>();

  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly sweep = inject(PageSweep);
  protected readonly collections = inject(CollectionService);
  protected readonly transition = inject(CollectionTransition);
  protected readonly wide = inject(ShellState).wide;
  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);

  protected readonly copy = COLLECTION;
  protected readonly formatCount = formatCount;
  protected readonly maxDepth = MAX_DEPTH;

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly dust = viewChild<ElementRef<HTMLCanvasElement>>('dust');

  /** The place the address asks for (FR-006). */
  protected readonly routed = computed<Place>(
    () => {
      const ref = this.ref();
      if (!ref) return { kind: 'list' };
      if (ref === HOLDING_REF) return { kind: 'holding' };
      return { kind: 'collection', id: ref };
    },
    { equal: samePlace },
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

  /** Depths of places already shown, so a collection removed mid-transition keeps its direction. */
  private readonly knownDepth = new Map<string, number>();
  private readonly depthOf = (id: string) => this.collections.depth(id) || this.knownDepth.get(id) || 0;

  protected readonly topLevel = computed(() => this.collections.childrenOf().get(null) ?? []);
  protected readonly stats = this.collections.stats;
  protected readonly empty = computed(() => this.topLevel().length === 0 && this.stats().holding.cards === 0);

  /** Set while the missing-place redirect runs, so its landing swaps with no sweep. */
  private redirecting = false;

  /**
   * A collection page's data (undefined once the collection is gone). Read from the template for
   * both the shown place and, during a change, the outgoing one.
   */
  protected pageOf(id: string) {
    const collection = this.collections.byId().get(id);
    if (!collection) return undefined;
    const depth = this.collections.depth(id);
    return {
      collection,
      color: colorOf(collection.color),
      ancestors: this.collections.path(id).slice(0, -1),
      depth,
      kind: this.collections.kind(id),
      totals: this.stats().byId.get(id) || { cards: 0, sale: 0, subs: 0, directEntries: 0 },
      children: this.collections.childrenOf().get(id) ?? [],
    };
  }

  constructor() {
    // Drive the transition from the address, once per new place. A missing place is left to the
    // redirect below, so the page never animates into nothing.
    let last: Place | null = null;
    effect(() => {
      const place = this.routed();
      if (this.missing()) return;
      untracked(() => {
        // Consumed before the same-place check: a redirect back to the current place must not
        // leave it set for the next real navigation.
        const instant = this.redirecting;
        this.redirecting = false;
        if (last && samePlace(last, place)) return;
        last = place;
        if (place.kind === 'collection') {
          this.knownDepth.set(place.id, this.collections.depth(place.id));
        }
        this.transition.go(place, this.depthOf, instant);
      });
    });

    // Unknown ids (another profile's, removed by a sync) and an empty holding box go back to the
    // list (FR-006). A page inside a subtree being deleted here goes to the deleted collection's
    // parent instead, as soon as it leaves the signal — before remove() even resolves (R8).
    effect(() => {
      if (!this.missing()) return;
      const place = this.routed();
      untracked(() => {
        const del = this.del();
        const inDeleted = place.kind === 'collection' && del?.subtree.has(place.id) && del.parentId;
        this.redirecting = true;
        this.router.navigate(inDeleted ? ['/collection', del!.parentId] : ['/collection'], { replaceUrl: true });
      });
    });

    // Focus the new place's h1 after each swap or change (not the first render), so it's announced.
    let first = true;
    effect(() => {
      this.transition.shown();
      if (this.transition.turning()) return;
      if (first) {
        first = false;
        return;
      }
      afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
    });

    effect(() => {
      const canvas = this.dust();
      if (canvas) {
        this.sweep.attach(canvas.nativeElement, this.host.nativeElement);
      }
    });
  }

  protected openCollection(id: string): void {
    this.router.navigate(['/collection', id]);
  }

  protected openHolding(): void {
    this.router.navigate(['/collection', HOLDING_REF]);
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

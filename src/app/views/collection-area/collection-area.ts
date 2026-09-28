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
// always renders the transition's `shown()` place, so the outgoing page stays up during "out".
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-collection-area',
  imports: [CollectionDeleteDialog, CollectionFormDialog, CollectionRow, CreateRow, RouterLink],
  providers: [CollectionTransition],
  styleUrl: './collection-area.scss',
  templateUrl: './collection-area.html',
})
export class CollectionArea {
  readonly ref = input<string>();

  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  protected readonly collections = inject(CollectionService);
  protected readonly transition = inject(CollectionTransition);
  protected readonly wide = inject(ShellState).wide;
  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);

  protected readonly copy = COLLECTION;
  protected readonly formatCount = formatCount;
  protected readonly maxDepth = MAX_DEPTH;

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly inner = viewChild.required<ElementRef<HTMLElement>>('inner');
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

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

  /** The collection on screen (undefined on the list/holding places, or once it's gone). */
  protected readonly current = computed<Collection | undefined>(() => {
    const shown = this.transition.shown();
    return shown.kind === 'collection' ? this.collections.byId().get(shown.id) : undefined;
  });
  protected readonly currentColor = computed(() => {
    const current = this.current();
    return current ? colorOf(current.color) : undefined;
  });
  protected readonly ancestors = computed(() => {
    const current = this.current();
    return current ? this.collections.path(current.id).slice(0, -1) : [];
  });
  protected readonly depth = computed(() => {
    const current = this.current();
    return current ? this.collections.depth(current.id) : 0;
  });
  protected readonly kind = computed(() => {
    const current = this.current();
    return current ? this.collections.kind(current.id) : 'empty';
  });
  protected readonly totals = computed(() => {
    const current = this.current();
    return (current && this.stats().byId.get(current.id)) || { cards: 0, sale: 0, subs: 0, directEntries: 0 };
  });
  protected readonly children = computed(() => {
    const current = this.current();
    return current ? (this.collections.childrenOf().get(current.id) ?? []) : [];
  });

  constructor() {
    // Drive the transition from the address, once per new place. A missing place is left to the
    // redirect below, so the page never animates into nothing.
    let last: Place | null = null;
    effect(() => {
      const place = this.routed();
      if (this.missing()) return;
      untracked(() => {
        if (last && samePlace(last, place)) return;
        last = place;
        if (place.kind === 'collection') {
          this.knownDepth.set(place.id, this.collections.depth(place.id));
        }
        this.transition.go(place, this.depthOf, {
          outer: () => this.stage().nativeElement.offsetHeight,
          inner: () => this.inner().nativeElement.scrollHeight,
        });
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
        this.router.navigate(inDeleted ? ['/collection', del!.parentId] : ['/collection'], { replaceUrl: true });
      });
    });

    // Focus the new place's h1 after each swap (not the first render), so it's announced.
    let first = true;
    effect(() => {
      this.transition.shown();
      if (first) {
        first = false;
        return;
      }
      afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
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

  protected orbRole(role: number): string {
    return `orb--${role}`;
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { CatalogCard } from '@models/catalog.model';
import { CardCatalogService } from '@services/card-catalog.service';
import { CardTile } from '@shared/cards/card-tile/card-tile';
import { CompactModal } from '@shared/ds/compact-modal/compact-modal';
import { CARD } from '@utils/card-copy';
import {
  INITIAL_SEARCH,
  PAGE_SIZE,
  canLoadMore,
  moreRequested,
  pageFailed,
  pageLoaded,
  retried,
  typed,
  type SearchState,
} from '@utils/card-search.util';
import { Roles } from '@utils/identity.util';

export const SEARCH_DEBOUNCE_MS = 250;
const PLACEHOLDERS = Array.from({ length: 10 }, (_, i) => i);

let nextId = 0;

// The "Adicionar cartas" search (ui.md §2.4, FR-005–FR-009): a name field, a 250 ms debounce, the
// `card-search.util` reducer, and a result grid that pages through a sentinel observed against the
// results area. It stays mounted, state kept, while the card modal is on top of it.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-card-search-modal',
  imports: [CompactModal, CardTile],
  templateUrl: './card-search-modal.html',
  styleUrl: './card-search-modal.scss',
})
export class CardSearchModal {
  readonly roles = input.required<Roles>();
  /** Another modal (the card modal, a notice) is on top; when it goes away the name field takes focus back. */
  readonly underneath = input(false);
  readonly pick = output<CatalogCard>();
  readonly closed = output<void>();

  private readonly catalog = inject(CardCatalogService);
  protected readonly copy = CARD;
  protected readonly placeholders = PLACEHOLDERS;

  private readonly uid = nextId++;
  protected readonly titleId = `grm-card-search-title-${this.uid}`;
  protected readonly inputId = `grm-card-search-name-${this.uid}`;
  protected readonly helpId = `grm-card-search-help-${this.uid}`;

  protected readonly state = signal<SearchState>(INITIAL_SEARCH);
  private readonly area = viewChild<ElementRef<HTMLElement>>('area');
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly injector = inject(Injector);
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** The message the polite live region reads: the result count, or the state's own message. */
  protected readonly announcement = computed(() => {
    const s = this.state();
    switch (s.status) {
      case 'ok':
        return s.moreFailed ? CARD.moreFailed : CARD.found(s.results.length, s.hasMore);
      case 'empty':
        return CARD.empty(s.text);
      case 'loading':
        return CARD.loading;
      case 'offline':
        return CARD.offline;
      case 'failed':
        return CARD.failed;
      default:
        return '';
    }
  });

  constructor() {
    effect((onCleanup) => {
      const area = this.area()?.nativeElement;
      const sentinel = this.sentinel()?.nativeElement;
      if (!area || !sentinel) {
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting) && canLoadMore(this.state())) {
            this.loadMore();
          }
        },
        { root: area },
      );
      observer.observe(sentinel);
      onCleanup(() => observer.disconnect());
    });

    // The modal on top restores focus to the result that opened it; the field is where the next
    // search starts (ui.md §4), so it takes focus once that modal is gone.
    let wasUnderneath = false;
    effect(() => {
      const underneath = this.underneath();
      if (wasUnderneath && !underneath) {
        afterNextRender(() => this.field()?.nativeElement.focus(), { injector: this.injector });
      }
      wasUnderneath = underneath;
    });

    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected onInput(text: string): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.state.update((s) => typed(s, text));
      this.fetchFirst();
    }, SEARCH_DEBOUNCE_MS);
  }

  protected retry(): void {
    this.state.update((s) => retried(s));
    this.fetchFirst();
  }

  protected retryMore(): void {
    this.loadMore();
  }

  private loadMore(): void {
    const before = this.state();
    const next = moreRequested(before);
    if (next === before) {
      return;
    }
    this.state.set(next);
    void this.fetch(next, Math.floor(next.results.length / PAGE_SIZE));
  }

  private fetchFirst(): void {
    const s = this.state();
    if (s.status === 'loading') {
      void this.fetch(s, 0);
    }
  }

  private async fetch(s: SearchState, page: number): Promise<void> {
    const generation = s.generation;
    try {
      const result = await this.catalog.search(s.text, page);
      this.state.update((cur) => pageLoaded(cur, generation, result.cards, result.hasMore));
    } catch (error) {
      const kind = (error as { kind?: string }).kind === 'offline' ? 'offline' : 'failed';
      this.state.update((cur) => pageFailed(cur, generation, kind));
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

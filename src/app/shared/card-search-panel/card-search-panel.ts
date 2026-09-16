import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CardLookupResult } from '@services/card-lookup.service';
import { getCardGlowColors } from '../../core/utils/card-color.util';
import { CardScanCapture } from '../card-scan-capture/card-scan-capture';

export type CardSearchMode = 'name' | 'setCode';

const NAME_SEARCH_MIN_LENGTH = 3;
const RESULTS_PAGE_SIZE = 15;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardScanCapture],
  selector: 'app-card-search-panel',
  styleUrl: './card-search-panel.scss',
  templateUrl: './card-search-panel.html',
})
export class CardSearchPanel {
  readonly searchMode = input.required<CardSearchMode>();
  readonly nameQuery = input.required<string>();
  readonly setCodeInput = input.required<string>();
  readonly collectorNumberInput = input.required<string>();
  readonly results = input.required<CardLookupResult[]>();
  readonly searching = input(false);
  readonly hasSearched = input(false);
  readonly searchError = input<string | null>(null);
  readonly ocrHelperMessage = input<string | null>(null);

  readonly searchModeChanged = output<CardSearchMode>();
  readonly nameQueryChanged = output<string>();
  readonly setCodeChanged = output<string>();
  readonly collectorNumberChanged = output<string>();
  readonly searchRequested = output<void>();
  readonly cameraCaptured = output<Blob>();
  readonly resultPicked = output<CardLookupResult>();

  readonly canSearch = computed(() =>
    this.searchMode() === 'name'
      ? this.nameQuery().trim().length >= NAME_SEARCH_MIN_LENGTH
      : this.setCodeInput().trim() !== '' && this.collectorNumberInput().trim() !== '',
  );

  readonly visibleCount = signal(RESULTS_PAGE_SIZE);
  readonly visibleResults = computed(() => this.results().slice(0, this.visibleCount()));
  readonly hasMore = computed(() => this.visibleCount() < this.results().length);

  // Offsets the per-card --i seed (see card-search-panel.scss) by a fresh
  // amount on every new search, so the staggered spread's shape isn't
  // pinned to array position — otherwise slot 0 always got the exact same
  // rotation/offset search after search, regardless of which card landed
  // there.
  readonly spreadSeed = signal(0);

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  // Each result's hover/focus glow follows its own color identity (see
  // card-color.util.ts) instead of a single shared theme accent, since many
  // differently-colored cards are on screen at once here.
  glowColors(result: CardLookupResult): string[] {
    return getCardGlowColors(result.colorIdentity);
  }

  constructor() {
    effect(() => {
      this.results(); // a new search (new array reference) resets the visible window
      this.visibleCount.set(RESULTS_PAGE_SIZE);
      this.spreadSeed.set(Math.random() * 1000);
    });

    effect((onCleanup) => {
      const el = this.sentinel()?.nativeElement;
      if (!el) {
        return;
      }
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            this.visibleCount.update((n) => Math.min(n + RESULTS_PAGE_SIZE, this.results().length));
          }
        },
        { rootMargin: '200px' },
      );
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
  }
}

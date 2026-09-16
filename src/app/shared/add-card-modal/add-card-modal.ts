import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CardCondition, CardEntry, CardFinish } from '@models/card.model';
import { DeckCardIdentity } from '@models/deck.model';
import { CardOcrService } from '@services/card-ocr.service';
import { CardService } from '@services/card.service';
import { CardLookupResult, CardLookupService } from '@services/card-lookup.service';
import { DeckService } from '@services/deck.service';
import { ThemeService } from '@services/theme.service';
import { SparkRerollDirective } from '@shared/spark-reroll/spark-reroll.directive';
import { getCardGlowColors } from '../../core/utils/card-color.util';
import { CardAddDetailPanel } from '../card-add-detail-panel/card-add-detail-panel';
import { CardSearchMode, CardSearchPanel } from '../card-search-panel/card-search-panel';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardSearchPanel, CardAddDetailPanel, SparkRerollDirective],
  selector: 'app-add-card-modal',
  styleUrl: './add-card-modal.scss',
  templateUrl: './add-card-modal.html',
  host: {
    '[style.--card-modal-primary]': 'themeService.roles().primary',
    '[style.--card-modal-primary-hover]': 'themeService.roles().primaryHover',
    '[style.--card-modal-accent]': 'themeService.roles().accent',
    '[style.--card-modal-accent-hover]': 'themeService.roles().accentHover',
    '[style.--card-modal-tertiary]': 'themeService.roles().tertiary',
  },
})
export class AddCardModal {
  private readonly cardLookup = inject(CardLookupService);
  private readonly cardService = inject(CardService);
  private readonly deckService = inject(DeckService);
  private readonly cardOcr = inject(CardOcrService);
  protected readonly themeService = inject(ThemeService);

  readonly open = input(false);
  readonly context = input.required<'collection' | 'deck'>();
  readonly filter = input<(card: DeckCardIdentity) => boolean>();
  readonly locationId = input<string>();
  readonly deckId = input<string>();

  readonly closed = output<void>();

  private readonly searchDialog = viewChild<ElementRef<HTMLDialogElement>>('searchDialog');
  private readonly confirmDialog = viewChild<ElementRef<HTMLDialogElement>>('confirmDialog');

  readonly searchMode = signal<CardSearchMode>('name');
  readonly nameQuery = signal('');
  readonly setCodeInput = signal('');
  readonly collectorNumberInput = signal('');
  readonly searching = signal(false);
  readonly hasSearched = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly results = signal<CardLookupResult[]>([]);
  readonly ocrHelperMessage = signal<string | null>(null);
  readonly selected = signal<CardLookupResult | null>(null);

  // Once a card is picked, the confirm step's whole ring/glow/spark/button
  // treatment switches from the user's saved theme to this specific card's
  // own color identity (see card-color.util.ts) — bound directly on the
  // confirm dialog in the template, overriding the theme values this
  // component's host otherwise sets for the search dialog.
  readonly cardGlow = computed(() => {
    const candidate = this.selected();
    return candidate ? getCardGlowColors(candidate.colorIdentity) : [];
  });

  readonly finish = signal<CardFinish | ''>('');
  readonly language = signal('');
  readonly condition = signal<CardCondition | ''>('');
  readonly quantity = signal('');
  readonly forSale = signal(false);
  readonly notes = signal('');

  readonly filteredResults = computed<CardLookupResult[]>(() => {
    const raw = this.results();
    if (this.context() !== 'deck') {
      return raw;
    }
    const filterFn = this.filter();
    if (!filterFn) {
      return raw;
    }
    return raw.filter((result) => filterFn(this.toIdentity(result)));
  });

  constructor() {
    effect(() => {
      const searchEl = this.searchDialog()?.nativeElement;
      const confirmEl = this.confirmDialog()?.nativeElement;
      if (!searchEl || !confirmEl) {
        return;
      }

      if (!this.open()) {
        closeDialog(searchEl);
        closeDialog(confirmEl);
        return;
      }

      if (this.selected() !== null) {
        closeDialog(searchEl);
        showDialogModal(confirmEl);
      } else {
        closeDialog(confirmEl);
        showDialogModal(searchEl);
      }
    });
  }

  // Guards against firing the same lookup twice in a row (e.g. a double
  // click, or hitting Buscar again with unchanged input) — set right
  // before the actual request so a genuinely new query always goes
  // through, and cleared in reset() so a fresh session isn't blocked by
  // the previous one's last query.
  private lastSearchKey: string | null = null;

  setSearchMode(mode: CardSearchMode): void {
    this.searchMode.set(mode);
  }

  async runSearch(): Promise<void> {
    const searchKey =
      this.searchMode() === 'name'
        ? `name:${this.nameQuery().trim()}`
        : `setCode:${this.setCodeInput().trim()}:${this.collectorNumberInput().trim()}`;
    if (searchKey === this.lastSearchKey) {
      return;
    }
    this.lastSearchKey = searchKey;

    this.searchError.set(null);
    this.searching.set(true);
    try {
      if (this.searchMode() === 'name') {
        const results = await this.cardLookup.searchByName(this.nameQuery());
        this.results.set(results);
      } else {
        const result = await this.cardLookup.lookup(
          this.setCodeInput().trim(),
          this.collectorNumberInput().trim(),
        );
        this.results.set([result]);
      }
    } catch (err) {
      // Let a failed request be retried with the exact same input — only
      // a successful search should dedupe a repeat.
      this.lastSearchKey = null;
      this.results.set([]);
      const message =
        err instanceof Error ? err.message : 'Não foi possível buscar cartas. Tente novamente.';
      // "Not found" is treated as an ordinary empty result (shown via the empty-state
      // message), not a connectivity-style error banner.
      this.searchError.set(message.startsWith('Nenhuma carta encontrada') ? null : message);
    } finally {
      this.searching.set(false);
      this.hasSearched.set(true);
    }
  }

  async onCameraCaptured(blob: Blob): Promise<void> {
    this.ocrHelperMessage.set(null);
    this.searchError.set(null);
    const guess = await this.cardOcr.run(blob);
    this.searchMode.set('setCode');
    this.setCodeInput.set(guess.setCode);
    this.collectorNumberInput.set(guess.collectorNumber);

    if (!guess.setCode || !guess.collectorNumber) {
      this.ocrHelperMessage.set(
        'Não foi possível ler as informações completas, digite ou tire uma nova foto.',
      );
      return;
    }

    this.searching.set(true);
    try {
      const result = await this.cardLookup.lookup(guess.setCode, guess.collectorNumber);
      this.results.set([result]);
      this.hasSearched.set(true);
      this.pickResult(result);
    } catch (err) {
      this.results.set([]);
      this.hasSearched.set(true);
      const message =
        err instanceof Error ? err.message : 'Não foi possível buscar a carta. Tente novamente.';
      this.searchError.set(message.startsWith('Nenhuma carta encontrada') ? null : message);
    } finally {
      this.searching.set(false);
    }
  }

  pickResult(result: CardLookupResult): void {
    this.resetPhysicalFields();
    this.selected.set(result);
  }

  back(): void {
    this.selected.set(null);
  }

  private ignoreNextSearchClose = false;

  onSearchDialogNativeClose(): void {
    // `closeAll()` closing this dialog programmatically also queues this same
    // native `close` event — skip the echo so `cancel()` doesn't run twice.
    if (this.ignoreNextSearchClose) {
      this.ignoreNextSearchClose = false;
      return;
    }
    // Our own forward transition (picking a result) closes this dialog too, but by
    // then `selected` is already set — only treat this as a real cancel otherwise.
    if (this.selected() === null) {
      this.cancel();
    }
  }

  onConfirmDialogNativeClose(): void {
    if (this.open() && this.selected() !== null) {
      this.back();
    }
  }

  submit(): void {
    const candidate = this.selected();
    if (!candidate) {
      return;
    }

    if (this.context() === 'deck') {
      const identity = this.toIdentity(candidate);
      const filterFn = this.filter();
      if (filterFn && !filterFn(identity)) {
        return;
      }
      const deckId = this.deckId();
      if (!deckId) {
        return;
      }
      this.deckService.addCard(deckId, {
        id: crypto.randomUUID(),
        source: 'freeBuild',
        card: identity,
      });
    } else {
      const locationId = this.locationId();
      if (!locationId) {
        return;
      }
      this.cardService.add({ ...this.buildCardEntryPayload(candidate), locationId });
    }

    this.reset();
    this.closeAll();
    this.closed.emit();
  }

  cancel(): void {
    this.reset();
    this.closeAll();
    this.closed.emit();
  }

  private closeAll(): void {
    const searchEl = this.searchDialog()?.nativeElement;
    const confirmEl = this.confirmDialog()?.nativeElement;
    if (searchEl) {
      if (searchEl.open) {
        this.ignoreNextSearchClose = true;
      }
      closeDialog(searchEl);
    }
    if (confirmEl) closeDialog(confirmEl);
  }

  private reset(): void {
    this.lastSearchKey = null;
    this.searchMode.set('name');
    this.nameQuery.set('');
    this.setCodeInput.set('');
    this.collectorNumberInput.set('');
    this.searching.set(false);
    this.hasSearched.set(false);
    this.searchError.set(null);
    this.results.set([]);
    this.ocrHelperMessage.set(null);
    this.selected.set(null);
    this.resetPhysicalFields();
  }

  private resetPhysicalFields(): void {
    this.finish.set('');
    this.language.set('');
    this.condition.set('');
    this.quantity.set('');
    this.forSale.set(false);
    this.notes.set('');
  }

  private toIdentity(result: CardLookupResult): DeckCardIdentity {
    return { ...result, finish: this.finish() || 'nonfoil' };
  }

  private buildCardEntryPayload(candidate: CardLookupResult): Omit<CardEntry, 'id' | 'locationId'> {
    return {
      ...candidate,
      finish: this.finish() || 'nonfoil',
      language: this.language().trim() || 'en',
      condition: this.condition() || 'NM',
      quantity: Number(this.quantity()) || 1,
      forSale: this.forSale(),
      notes: this.notes().trim() || undefined,
    };
  }
}

// jsdom (used by the unit test runner) doesn't implement the native <dialog>
// show/close behavior, so guard these calls rather than assume support.
function showDialogModal(el: HTMLDialogElement): void {
  if (!el.open && typeof el.showModal === 'function') {
    el.showModal();
  }
}

function closeDialog(el: HTMLDialogElement): void {
  if (el.open && typeof el.close === 'function') {
    el.close();
  }
}

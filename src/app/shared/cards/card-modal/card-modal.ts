import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  type OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  CARD_CONDITIONS,
  CARD_FINISHES,
  CARD_LANGUAGES,
  type CardCondition,
  type CardEntry,
  type CardFinish,
} from '@models/card.model';
import type { CatalogCard, CatalogCardDetail, CatalogPrinting } from '@models/catalog.model';
import { CardCatalogService } from '@services/card-catalog.service';
import { CompactModal } from '@shared/ds/compact-modal/compact-modal';
import {
  SelectEmpty,
  SelectList,
  SelectOption,
  SelectTrigger,
} from '@shared/ds/select-list/select-list';
import { cardPalette } from '@utils/card-colors.util';
import { CARD, CONDITION_NAMES, FINISH_NAMES } from '@utils/card-copy';
import {
  canBeCommander,
  filterPrintings,
  initialPrinting,
  printingFromEntry,
  printingIdentity,
  validateQuantity,
  type OwnershipFields,
  type PrintingFields,
} from '@utils/card-entry.util';

/** What the modal emits: the printing's identity and the ownership fields, enough to add or update a card. */
export interface CardDraft extends PrintingFields, OwnershipFields {
  /** Set on add only; an edit never changes it. */
  canBeCommander?: boolean;
}

export interface CardSave {
  draft: CardDraft;
  again: boolean;
}

type DetailState = 'loading' | 'ready' | 'failed';

let nextId = 0;

// The add / edit card modal (ui.md §2.5, FR-010–FR-014): the printing on the left (image, set filter,
// printing list), the ownership fields on the right. Add mode loads the card's printings from the
// catalog; until they arrive the fields are usable but nothing can be saved. Edit mode shows the
// owned card's own printing at once and loads the list in the background; without it (offline)
// only the printing can't change (R13).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-card-modal',
  imports: [CompactModal, SelectList, SelectTrigger, SelectOption, SelectEmpty],
  templateUrl: './card-modal.html',
  styleUrl: './card-modal.scss',
})
export class CardModal implements OnInit {
  readonly mode = input.required<'add' | 'edit'>();
  /** Add mode: the search result that was picked. */
  readonly catalogCard = input<CatalogCard>();
  /** Edit mode: the owned card. */
  readonly card = input<CardEntry>();
  readonly collectionName = input.required<string>();
  readonly save = output<CardSave>();
  readonly closed = output<void>();

  private readonly catalog = inject(CardCatalogService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly copy = CARD;
  protected readonly finishes = CARD_FINISHES.map((value) => ({ value, name: FINISH_NAMES[value] }));
  protected readonly languages = CARD_LANGUAGES;
  protected readonly conditions = CARD_CONDITIONS.map((value) => ({ value, name: CONDITION_NAMES[value] }));
  protected readonly printingKey = (printing: CatalogPrinting) => printing.scryfallId;

  private readonly uid = nextId++;
  protected readonly titleId = `grm-card-modal-title-${this.uid}`;
  protected readonly setFilterId = `grm-card-modal-set-${this.uid}`;
  protected readonly finishId = `grm-card-modal-finish-${this.uid}`;
  protected readonly languageId = `grm-card-modal-language-${this.uid}`;
  protected readonly conditionId = `grm-card-modal-condition-${this.uid}`;
  protected readonly quantityId = `grm-card-modal-quantity-${this.uid}`;
  protected readonly quantityErrorId = `grm-card-modal-quantity-error-${this.uid}`;
  protected readonly notesId = `grm-card-modal-notes-${this.uid}`;

  protected readonly detailState = signal<DetailState>('loading');
  private readonly detail = signal<CatalogCardDetail | null>(null);
  protected readonly selectedPrinting = signal<CatalogPrinting | null>(null);
  protected readonly setFilter = signal('');

  protected readonly finish = signal<CardFinish>('nonfoil');
  protected readonly language = signal('en');
  protected readonly condition = signal<CardCondition>('NM');
  protected readonly quantityText = signal('1');
  protected readonly notes = signal('');
  protected readonly forSale = signal(false);

  /** The card's identity, available before the printings load: the picked result, or the owned card. */
  protected readonly identity = computed(() => this.catalogCard() ?? this.card());
  protected readonly palette = computed(() => cardPalette(this.identity()?.colorIdentity ?? []));
  protected readonly roles = computed(() => this.palette().roles);

  /** Until the list loads (or when it can't), an edit offers only the current printing. */
  protected readonly printings = computed(() => {
    const detail = this.detail();
    const selected = this.selectedPrinting();
    if (!selected) {
      return [];
    }
    return detail ? filterPrintings(detail.printings, this.setFilter(), selected.scryfallId) : [selected];
  });
  protected readonly noSetMatch = computed(() => this.detailState() === 'ready' && this.printings().length === 0);
  protected readonly artist = computed(() => this.selectedPrinting()?.artist ?? null);
  protected readonly image = computed(() => {
    const printing = this.selectedPrinting();
    return printing
      ? (printing.imageUrl ?? printing.faces?.[0]?.imageUrl ?? null)
      : (this.identity()?.imageUrl ?? null);
  });

  protected readonly quantityValid = computed(() => validateQuantity(this.quantityText()).ok);
  protected readonly canSave = computed(
    () =>
      (this.mode() === 'edit' || this.detailState() === 'ready') &&
      this.selectedPrinting() !== null &&
      this.quantityValid(),
  );

  ngOnInit(): void {
    const card = this.card();
    if (this.mode() === 'edit' && card) {
      this.selectedPrinting.set(printingFromEntry(card));
      this.finish.set(card.finish);
      this.language.set(card.language);
      this.condition.set(card.condition);
      this.quantityText.set(String(card.quantity));
      this.notes.set(card.notes ?? '');
      this.forSale.set(card.forSale);
    }
    void this.load();
  }

  protected async load(): Promise<void> {
    const oracleId = this.identity()?.oracleId;
    if (!oracleId) {
      return;
    }
    this.detailState.set('loading');
    try {
      const detail = await this.catalog.detail(oracleId);
      if (detail.printings.length === 0) {
        throw new Error('no printings');
      }
      const hadFocus = this.host.contains(document.activeElement) && this.loadingTrigger() === document.activeElement;
      const current = this.selectedPrinting();
      this.detail.set(detail);
      this.selectedPrinting.set(
        current
          ? (detail.printings.find((printing) => printing.scryfallId === current.scryfallId) ?? current)
          : initialPrinting(detail.printings),
      );
      this.detailState.set('ready');
      if (hadFocus) {
        afterNextRender(() => this.host.querySelector<HTMLElement>('.printing app-select-list button')?.focus(), {
          injector: this.injector,
        });
      }
    } catch {
      this.detailState.set('failed');
    }
  }

  private loadingTrigger(): Element | null {
    return this.host.querySelector('.printing-loading');
  }

  protected selectPrinting(printing: CatalogPrinting): void {
    this.selectedPrinting.set(printing);
  }

  protected submit(again: boolean, event?: Event): void {
    event?.preventDefault();
    const detail = this.detail();
    const printing = this.selectedPrinting();
    const quantity = validateQuantity(this.quantityText());
    if (!this.canSave() || !printing || !quantity.ok) {
      return;
    }
    const notes = this.notes().trim();
    const ownership: OwnershipFields = {
      finish: this.finish(),
      language: this.language(),
      condition: this.condition(),
      quantity: quantity.value,
      forSale: this.forSale(),
      notes: notes ? notes : undefined,
    };
    const card = this.card();
    if (this.mode() === 'edit' && card) {
      this.save.emit({ again: false, draft: { ...this.editIdentity(card, detail, printing), ...ownership } });
      return;
    }
    if (!detail) {
      return;
    }
    this.save.emit({
      again,
      draft: {
        ...printingIdentity(detail, printing),
        canBeCommander: canBeCommander(detail.typeLine, detail.oracleText, detail.cardFaces),
        ...ownership,
      },
    });
  }

  /**
   * The owned card's identity, or the chosen printing's when it changed. `artist` and `faces` are
   * always present so a patch clears what the new printing lacks.
   */
  private editIdentity(card: CardEntry, detail: CatalogCardDetail | null, printing: CatalogPrinting): PrintingFields {
    if (detail && printing.scryfallId !== card.scryfallId) {
      const identity = printingIdentity(detail, printing);
      return { ...identity, artist: identity.artist };
    }
    return {
      name: card.name,
      scryfallId: card.scryfallId,
      oracleId: card.oracleId,
      setCode: card.setCode,
      setName: card.setName,
      collectorNumber: card.collectorNumber,
      rarity: card.rarity,
      commanderLegality: card.commanderLegality,
      colorIdentity: card.colorIdentity,
      typeLine: card.typeLine,
      imageUrl: card.imageUrl,
      faces: card.faces,
      artist: card.artist,
    };
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardEntry, CardCondition, CardFinish, CardRarity, Color } from '@models/card.model';
import { StorageLocation } from '@models/storage-location.model';
import { CardFilterService } from '@services/card-filter.service';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { ThemeService } from '@services/theme.service';
import { AddCardModal, CollectionCardGrid, LocationModal, LocationStrip } from '@shared';
import { CollectionViewMode } from '../../shared/cards/collection-card-grid/collection-card-grid';
import { matchesCardQuery } from '@utils/text-search.util';

const COLOR_LETTERS: readonly Color[] = ['W', 'U', 'B', 'R', 'G'];

type SortOption = 'recent' | 'name' | 'set' | 'quantity' | 'color';

const VIEW_MODE_STORAGE_KEY = 'grimorio.collectionDetail.viewMode';

function loadViewMode(): CollectionViewMode {
  const raw = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return raw === 'list' ? 'list' : 'grid';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AddCardModal, LocationStrip, LocationModal, CollectionCardGrid],
  selector: 'app-collection-detail',
  styleUrl: './collection-detail.scss',
  templateUrl: './collection-detail.html',
  host: {
    '[style.--detail-primary]': 'themeService.roles().primary',
    '[style.--detail-accent]': 'themeService.roles().accent',
    '[style.--detail-tertiary]': 'themeService.roles().tertiary',
  },
})
export class CollectionDetail {
  private readonly locationsService = inject(StorageLocationService);
  private readonly cardService = inject(CardService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly themeService = inject(ThemeService);
  protected readonly filterService = inject(CardFilterService);

  readonly id = input.required<string>();

  constructor() {
    effect(() => {
      this.id(); // track id changes
      this.filterService.panelOpen.set(false);
      this.filterService.reset();
      this.hydrateFiltersFromQueryParams();
    });

    inject(DestroyRef).onDestroy(() => {
      this.filterService.reset();
      this.filterService.panelOpen.set(false);
    });
  }

  readonly showAddModal = signal(false);
  readonly showLocationModal = signal(false);
  readonly editingLocation = signal<StorageLocation | null>(null);
  readonly editingCard = signal<CardEntry | null>(null);

  readonly filterQuery = signal('');
  readonly sortBy = signal<SortOption>('recent');
  readonly viewMode = signal<CollectionViewMode>(loadViewMode());

  readonly location = computed(() => this.locationsService.byId(this.id())());
  readonly breadcrumb = computed(() => this.locationsService.breadcrumb(this.id())());
  readonly childLocations = computed(() => this.locationsService.childrenOf(this.id())());

  readonly cardsHere = computed(() =>
    this.cardService.cards().filter((card) => card.locationId === this.id()),
  );

  readonly stats = computed(() => {
    const cards = this.cardsHere();
    return {
      total: cards.reduce((n, c) => n + c.quantity, 0),
      unique: cards.length,
      sublocs: this.childLocations().length,
      forSale: cards.filter((c) => c.forSale).reduce((n, c) => n + c.quantity, 0),
    };
  });

  readonly filteredCards = computed(() => {
    const query = this.filterQuery().trim();
    const cards = this.cardsHere();
    if (query === '') {
      return cards;
    }
    return cards.filter((card) => matchesCardQuery(card, query));
  });

  readonly filteredByFilters = computed(() => this.filterService.apply(this.filteredCards()));

  readonly resultLabel = computed(() => {
    const total = this.stats().unique;
    if (!this.filterService.isActive()) {
      return `${total} cartas`;
    }
    return `${this.filteredByFilters().length} de ${total} cartas`;
  });

  readonly visibleCards = computed(() => {
    const cards = [...this.filteredByFilters()];
    switch (this.sortBy()) {
      case 'name':
        return cards.sort((a, b) => a.name.localeCompare(b.name));
      case 'set':
        return cards.sort((a, b) => a.setCode.localeCompare(b.setCode));
      case 'quantity':
        return cards.sort((a, b) => b.quantity - a.quantity);
      case 'color':
        return cards.sort((a, b) => compareColor(a, b));
      case 'recent':
      default:
        return cards.reverse();
    }
  });

  setFilterQuery(value: string): void {
    this.filterQuery.set(value);
  }

  setSortBy(value: SortOption): void {
    this.sortBy.set(value);
  }

  setViewMode(mode: CollectionViewMode): void {
    this.viewMode.set(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }

  clearFilter(): void {
    this.filterQuery.set('');
  }

  removeCard(id: string): void {
    this.cardService.remove(id);
  }

  editCard(card: CardEntry): void {
    this.editingCard.set(card);
    this.showAddModal.set(true);
  }

  startAddCard(): void {
    this.editingCard.set(null);
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.editingCard.set(null);
  }

  openLocationModal(): void {
    this.editingLocation.set(null);
    this.showLocationModal.set(true);
  }

  closeLocationModal(): void {
    this.showLocationModal.set(false);
    this.editingLocation.set(null);
  }

  onLocationSaved(location: StorageLocation): void {
    if (this.editingLocation() === null) {
      this.router.navigate(['/collection', location.id]);
    }
  }

  private hydrateFiltersFromQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    let hasParams = false;

    const cor = params.get('cor');
    if (cor) {
      hasParams = true;
      for (const letter of cor) {
        if (letter === 'C') {
          this.filterService.setField('colorless', true);
        } else if ((COLOR_LETTERS as string[]).includes(letter)) {
          this.filterService.toggleColor(letter as Color);
        }
      }
    }

    if (params.get('match') === 'exata') {
      hasParams = true;
      this.filterService.setField('colorMatch', 'exact');
    }

    if (params.get('venda') === '1') {
      hasParams = true;
      this.filterService.setField('forSale', true);
    }

    const raridade = params.get('raridade');
    if (raridade) {
      hasParams = true;
      this.filterService.setField('rarity', raridade as CardRarity);
    }

    const acabamento = params.get('acabamento');
    if (acabamento) {
      hasParams = true;
      this.filterService.setField('finish', acabamento as CardFinish);
    }

    const condicao = params.get('condicao');
    if (condicao) {
      hasParams = true;
      this.filterService.setField('condition', condicao as CardCondition);
    }

    const set = params.get('set');
    if (set) {
      hasParams = true;
      this.filterService.setField('setCode', set);
    }

    const tipo = params.get('tipo');
    if (tipo) {
      hasParams = true;
      this.filterService.setField('type', tipo);
    }

    if (hasParams) {
      this.filterService.panelOpen.set(true);
    }
  }
}

function compareColor(a: CardEntry, b: CardEntry): number {
  const key = (card: CardEntry) =>
    card.colorIdentity.length === 0 ? '~' : card.colorIdentity.join('');
  return key(a).localeCompare(key(b));
}

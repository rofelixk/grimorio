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
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { CardEntry, Color } from '@models/card.model';
import { StorageLocation } from '@models/storage-location.model';
import { CardFilters, CardFilterService, ListField } from '@services/card-filter.service';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { ThemeService } from '@services/theme.service';
import { AddCardModal, CollectionCardGrid, LocationModal, LocationStrip } from '@shared';
import { CollectionViewMode } from '../../shared/cards/collection-card-grid/collection-card-grid';
import { matchesCardQuery } from '@utils/text-search.util';

const COLOR_LETTERS: readonly Color[] = ['W', 'U', 'B', 'R', 'G'];

// Maps each multi-select list filter to its (Portuguese) query-param name,
// shared by hydrate/serialize so adding a list filter only means editing
// this one table instead of both functions.
const LIST_FIELD_PARAMS = [
  { field: 'rarity', param: 'raridade' },
  { field: 'finish', param: 'acabamento' },
  { field: 'condition', param: 'condicao' },
  { field: 'type', param: 'tipo' },
] as const satisfies { field: ListField; param: string }[];

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

  // Tracked alongside `id` so filters also re-hydrate when the URL's query
  // params change without the route's :id changing — e.g. following a
  // filtered link to the same location already being viewed, where `id`
  // never fires but the params the panel should reflect did change.
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  constructor() {
    effect(() => {
      this.id();
      const params = this.queryParamMap();
      this.filterService.panelOpen.set(false);
      this.filterService.reset();
      this.hydrateFiltersFromQueryParams(params);
    });

    // Write direction: reflect the current filters into the URL's query params.
    // This does not persist to localStorage - the URL is the only place filter
    // state is externalized. `replaceUrl: true` keeps filter tweaks out of
    // browser history and does not change `this.id()`, so this settles after
    // one pass rather than looping with the hydration effect above.
    effect(() => {
      const queryParams = serializeFiltersToQueryParams(this.filterService.filters());
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
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

  private hydrateFiltersFromQueryParams(params: ParamMap): void {
    // Derived straight from the raw params, not from filterService.filters()
    // — the hydrate effect below calls this method while tracking signals,
    // so reading a service signal in here would silently make that effect
    // depend on it too, re-triggering (and resetting filters) on every
    // later filter change, not just on an actual URL change.
    const hasParams =
      !!params.get('cor') ||
      params.get('match') === 'exata' ||
      params.get('venda') === '1' ||
      LIST_FIELD_PARAMS.some(({ param }) => !!params.get(param));

    const cor = params.get('cor');
    if (cor) {
      const colors = new Set<Color>();
      let colorless = false;
      for (const letter of cor) {
        if (letter === 'C') {
          colorless = true;
        } else if ((COLOR_LETTERS as string[]).includes(letter)) {
          colors.add(letter as Color);
        }
      }
      this.filterService.setField('colors', [...colors]);
      if (colorless) {
        this.filterService.setField('colorless', true);
      }
    }

    if (params.get('match') === 'exata') {
      this.filterService.setField('colorMatch', 'exact');
    }

    if (params.get('venda') === '1') {
      this.filterService.setField('forSale', true);
    }

    for (const { field, param } of LIST_FIELD_PARAMS) {
      const raw = params.get(param);
      if (raw) {
        this.filterService.setField(field, raw.split(',') as CardFilters[typeof field]);
      }
    }

    if (hasParams) {
      this.filterService.panelOpen.set(true);
    }
  }
}

function serializeFiltersToQueryParams(f: CardFilters): Params {
  const cor = COLOR_LETTERS.filter((c) => f.colors.includes(c)).join('') + (f.colorless ? 'C' : '');

  const params: Params = {
    cor: cor === '' ? null : cor,
    match: f.colorMatch === 'exact' ? 'exata' : null,
    venda: f.forSale ? '1' : null,
  };
  for (const { field, param } of LIST_FIELD_PARAMS) {
    const list = f[field];
    params[param] = list.length > 0 ? list.join(',') : null;
  }
  return params;
}

function compareColor(a: CardEntry, b: CardEntry): number {
  const key = (card: CardEntry) =>
    card.colorIdentity.length === 0 ? '~' : card.colorIdentity.join('');
  return key(a).localeCompare(key(b));
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import {
  CollectionHeader,
  CollectionSearchRow,
  LocationChip,
  LocationModal,
  LocationPlateList,
  SearchResultsList,
} from '@shared';
import { COLORLESS_GLOW, getCardGlowColors } from '../../core/utils/card-color.util';

type Mode = 'locations' | 'results';

const DEFAULT_HINT =
  'Busca por nome, set ou número do coletor — resultados mostram o local de cada carta.';
const SHORT_QUERY_HINT = 'Digite pelo menos 3 letras para buscar.';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CollectionHeader, LocationPlateList, SearchResultsList, LocationModal],
  selector: 'app-collection',
  styleUrl: './collection.scss',
  templateUrl: './collection.html',
})
export class Collection {
  private readonly locationsService = inject(StorageLocationService);
  private readonly cardService = inject(CardService);

  readonly query = signal('');
  readonly submittedQuery = signal('');
  readonly mode = signal<Mode>('locations');
  readonly openLocationId = signal<string | null>(null);
  readonly locationFilter = signal<string | null>(null);

  readonly showLocationModal = signal(false);
  readonly createParentId = signal<string | null>(null);

  readonly rootLocations = computed(() => this.locationsService.tree());
  readonly totalLocations = computed(() => this.rootLocations().length);
  readonly totalSublocations = computed(
    () => this.locationsService.locations().length - this.totalLocations(),
  );
  readonly totalCards = computed(() =>
    this.cardService.cards().reduce((total, card) => total + card.quantity, 0),
  );

  readonly createParentName = computed(() => {
    const parentId = this.createParentId();
    return parentId ? this.locationsService.byId(parentId)()?.name ?? null : null;
  });

  private readonly results = computed(() => this.cardService.search(this.submittedQuery()));

  readonly resultRows = computed<CollectionSearchRow[]>(() =>
    this.results().map((card) => ({
      card,
      locationId: card.locationId,
      locationPath: this.locationsService
        .breadcrumb(card.locationId)()
        .map((location) => location.name)
        .join(' / '),
      printColor:
        card.colorIdentity.length === 0
          ? COLORLESS_GLOW
          : getCardGlowColors(card.colorIdentity)[0],
    })),
  );

  readonly locationChips = computed<LocationChip[]>(() => {
    const chips = new Map<string, LocationChip>();
    for (const row of this.resultRows()) {
      const existing = chips.get(row.locationId);
      if (existing) {
        existing.count += 1;
      } else {
        chips.set(row.locationId, {
          id: row.locationId,
          name: row.locationPath.split(' / ')[0],
          count: 1,
        });
      }
    }
    return [...chips.values()];
  });

  readonly filteredRows = computed(() => {
    const filter = this.locationFilter();
    return filter
      ? this.resultRows().filter((row) => row.locationId === filter)
      : this.resultRows();
  });

  readonly hint = computed(() => {
    if (this.mode() === 'results') {
      return `${this.resultRows().length} cartas em ${this.locationChips().length} locais para "${this.submittedQuery()}".`;
    }
    const length = this.query().trim().length;
    return length > 0 && length < 3 ? SHORT_QUERY_HINT : DEFAULT_HINT;
  });

  onQueryChange(value: string): void {
    this.query.set(value);
  }

  onSubmit(): void {
    const trimmed = this.query().trim();
    if (trimmed.length < 3) {
      return;
    }
    this.submittedQuery.set(trimmed);
    this.locationFilter.set(null);
    this.mode.set('results');
  }

  onClearOrBack(): void {
    this.mode.set('locations');
    this.query.set('');
    this.submittedQuery.set('');
    this.locationFilter.set(null);
  }

  toggleLocation(id: string): void {
    this.openLocationId.set(this.openLocationId() === id ? null : id);
  }

  openCreateLocationModal(): void {
    this.createParentId.set(null);
    this.showLocationModal.set(true);
  }

  openCreateSublocationModal(parentId: string): void {
    this.createParentId.set(parentId);
    this.showLocationModal.set(true);
  }

  closeLocationModal(): void {
    this.showLocationModal.set(false);
  }

  deleteLocation(id: string): void {
    this.locationsService.remove(id);
    if (this.openLocationId() === id) {
      this.openLocationId.set(null);
    }
  }
}

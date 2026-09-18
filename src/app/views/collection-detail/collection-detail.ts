import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CardEntry } from '@models/card.model';
import { StorageLocation } from '@models/storage-location.model';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { ThemeService } from '@services/theme.service';
import { AddCardModal, CollectionCardGrid, LocationModal, LocationStrip } from '@shared';
import { CollectionViewMode } from '../../shared/collection-card-grid/collection-card-grid';
import { matchesCardQuery } from '../../core/utils/text-search.util';

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
  protected readonly themeService = inject(ThemeService);

  readonly id = input.required<string>();

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

  readonly visibleCards = computed(() => {
    const cards = [...this.filteredCards()];
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
}

function compareColor(a: CardEntry, b: CardEntry): number {
  const key = (card: CardEntry) =>
    card.colorIdentity.length === 0 ? '~' : card.colorIdentity.join('');
  return key(a).localeCompare(key(b));
}

import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { AddCardModal, CardList, LocationChildren } from '@shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LocationChildren, CardList, AddCardModal],
  selector: 'app-location-detail',
  styleUrl: './location-detail.scss',
  templateUrl: './location-detail.html',
})
export class LocationDetail {
  private readonly locationsService = inject(StorageLocationService);
  private readonly cardService = inject(CardService);

  readonly id = input.required<string>();
  readonly showAddModal = signal(false);

  readonly location = computed(() => this.locationsService.byId(this.id())());
  readonly breadcrumb = computed(() => this.locationsService.breadcrumb(this.id())());
  readonly cardsHere = computed(() =>
    this.cardService.cards().filter((card) => card.locationId === this.id()),
  );

  removeCard(id: string): void {
    this.cardService.remove(id);
  }
}

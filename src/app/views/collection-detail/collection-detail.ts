import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { AddCardModal, CardList, CollectionChildren } from '@shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CollectionChildren, CardList, AddCardModal],
  selector: 'app-collection-detail',
  styleUrl: './collection-detail.scss',
  templateUrl: './collection-detail.html',
})
export class CollectionDetail {
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

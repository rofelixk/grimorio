import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardEntry } from '../../core/models/card.model';
import { CardService } from '../../core/services/card.service';
import { StorageLocationService } from '../../core/services/storage-location.service';
import { AddCardForm } from '../../shared/add-card-form/add-card-form';
import { CardList } from '../../shared/card-list/card-list';
import { LocationChildren } from '../../shared/location-children/location-children';

@Component({
  imports: [RouterLink, LocationChildren, CardList, AddCardForm],
  selector: 'app-location-detail',
  styleUrl: './location-detail.scss',
  templateUrl: './location-detail.html',
})
export class LocationDetail {
  private readonly locationsService = inject(StorageLocationService);
  private readonly cardService = inject(CardService);

  readonly id = input.required<string>();

  readonly location = computed(() => this.locationsService.byId(this.id())());
  readonly breadcrumb = computed(() => this.locationsService.breadcrumb(this.id())());
  readonly cardsHere = computed(() =>
    this.cardService.cards().filter((card) => card.locationId === this.id()),
  );

  addCard(card: Omit<CardEntry, 'id' | 'locationId'>): void {
    this.cardService.add({ ...card, locationId: this.id() });
  }

  removeCard(id: string): void {
    this.cardService.remove(id);
  }
}

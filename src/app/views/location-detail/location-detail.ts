import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardEntry } from '@models/card.model';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { AddCardForm, CardList, CardScanForm, LocationChildren } from '@shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LocationChildren, CardList, AddCardForm, CardScanForm],
  selector: 'app-location-detail',
  styleUrl: './location-detail.scss',
  templateUrl: './location-detail.html',
})
export class LocationDetail {
  private readonly locationsService = inject(StorageLocationService);
  private readonly cardService = inject(CardService);

  readonly id = input.required<string>();
  readonly addMode = signal<'manual' | 'scan'>('manual');

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

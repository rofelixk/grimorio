import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorageLocationNode } from '@models/storage-location.model';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { getLocationAccent } from '../../core/utils/card-color.util';
import { countCardsInLocations } from '../../core/utils/location-cards.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'app-location-plate',
  styleUrl: './location-plate.scss',
  templateUrl: './location-plate.html',
})
export class LocationPlate {
  private readonly cardService = inject(CardService);
  private readonly locationsService = inject(StorageLocationService);

  readonly node = input.required<StorageLocationNode>();
  readonly open = input(false);

  readonly togglePlate = output<void>();
  readonly createSublocation = output<void>();
  // Carries the id of whichever location (this plate's own, or one of its
  // direct sublocations) the delete button was clicked for.
  readonly locationDeleted = output<string>();

  readonly pip = computed(() => getLocationAccent(this.node().id));

  readonly subNames = computed(() => this.node().children.map((child) => child.name).join(' · '));

  readonly totalCards = computed(() => {
    const id = this.node().id;
    return countCardsInLocations(this.cardService.cards(), [
      id,
      ...this.locationsService.descendantIds(id)(),
    ]);
  });

  countFor(id: string): number {
    return countCardsInLocations(this.cardService.cards(), [
      id,
      ...this.locationsService.descendantIds(id)(),
    ]);
  }
}

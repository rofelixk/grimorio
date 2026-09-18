import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StorageLocationNode } from '@models/storage-location.model';
import { LocationPlate } from '@shared/location-plate/location-plate';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocationPlate],
  selector: 'app-location-plate-list',
  styleUrl: './location-plate-list.scss',
  templateUrl: './location-plate-list.html',
})
export class LocationPlateList {
  readonly locations = input.required<StorageLocationNode[]>();
}

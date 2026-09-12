import { Component, computed, inject, input } from '@angular/core';
import { StorageLocationService } from '../../core/services/storage-location.service';
import { EntityList } from '../entity-list/entity-list';

@Component({
  imports: [EntityList],
  selector: 'app-location-children',
  styleUrl: './location-children.scss',
  templateUrl: './location-children.html',
})
export class LocationChildren {
  private readonly locationsService = inject(StorageLocationService);

  readonly parentId = input.required<string | null>();

  readonly children = computed(() =>
    this.locationsService.locations().filter((location) => location.parentId === this.parentId()),
  );

  addChild(name: string): void {
    this.locationsService.add({ name, parentId: this.parentId() });
  }

  removeChild(id: string): void {
    this.locationsService.remove(id);
  }
}

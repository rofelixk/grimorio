import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorageLocationService } from '../../core/services/storage-location.service';

@Component({
  imports: [RouterLink],
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

  readonly newChildName = signal('');

  addChild(): void {
    const name = this.newChildName().trim();
    if (!name) {
      return;
    }
    this.locationsService.add({ name, parentId: this.parentId() });
    this.newChildName.set('');
  }

  removeChild(id: string): void {
    this.locationsService.remove(id);
  }
}

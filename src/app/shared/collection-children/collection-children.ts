import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { StorageLocationService } from '@services/storage-location.service';
import { EntityList } from '@shared/entity-list/entity-list';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntityList],
  selector: 'app-collection-children',
  styleUrl: './collection-children.scss',
  templateUrl: './collection-children.html',
})
export class CollectionChildren {
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

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StorageLocationNode } from '@models/storage-location.model';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { ThemeService } from '@services/theme.service';
import { getLocationAccent, MTG_PRINT_COLORS } from '../../core/utils/card-color.util';
import { countCardsInLocations } from '../../core/utils/location-cards.util';

const MAX_CHIPS = 3;

interface LocationChipVm {
  id: string;
  name: string;
  count: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'app-location-plate',
  styleUrl: './location-plate.scss',
  templateUrl: './location-plate.html',
  host: {
    // Card-count color follows the user's own chosen identity color (see
    // architecture.md's "Theme-role retinting convention"), not the pip
    // (which is per-location, not per-user) or the app's fixed ember brand
    // color.
    '[style.--plate-primary]': 'themeService.roles().primary',
  },
})
export class LocationPlate {
  private readonly cardService = inject(CardService);
  private readonly locationsService = inject(StorageLocationService);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

  readonly node = input.required<StorageLocationNode>();

  // Seeded per-spark index — a static array walked in the template, not
  // random state, so the spark field's geometry (computed from --i in SCSS)
  // stays stable across re-renders. Same idiom as LeylineField.
  protected readonly sparkIndices = Array.from({ length: 9 }, (_, i) => i);

  readonly pip = computed(() => {
    const color = this.node().color;
    return color ? MTG_PRINT_COLORS[color] : getLocationAccent(this.node().id);
  });

  readonly totalCards = computed(() => this.countSubtree(this.node().id));

  readonly chips = computed(() => {
    const children = this.node().children;
    const shown: LocationChipVm[] = children.slice(0, MAX_CHIPS).map((child) => ({
      id: child.id,
      name: child.name,
      count: this.countSubtree(child.id),
    }));

    const rest = children.length - shown.length;
    const overflowLabel =
      rest > 0
        ? `+${rest} ${rest === 1 ? 'sublocal' : 'sublocais'}`
        : children.length === 0
          ? 'Sem sublocais'
          : null;

    return { shown, overflowLabel };
  });

  private countSubtree(id: string): number {
    return countCardsInLocations(this.cardService.cards(), [
      id,
      ...this.locationsService.descendantIds(id)(),
    ]);
  }

  open(): void {
    this.router.navigate(['/collection', this.node().id]);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.open();
    }
  }
}

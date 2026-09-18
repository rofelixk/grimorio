import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { getLocationAccent } from '../../core/utils/card-color.util';
import { countCardsInLocations } from '../../core/utils/location-cards.util';

const MAX_VISIBLE_ROWS = 2;
const DESKTOP_COLUMNS = 6;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'app-location-strip',
  styleUrl: './location-strip.scss',
  templateUrl: './location-strip.html',
})
export class LocationStrip {
  private readonly locationsService = inject(StorageLocationService);
  private readonly cardService = inject(CardService);

  readonly parentId = input.required<string>();
  readonly addRequested = output<void>();

  readonly stripExpanded = signal(false);

  readonly children = computed(() => this.locationsService.childrenOf(this.parentId())());

  // Cap collapsed view at 2 full rows (including the trailing "+ Novo"
  // cell), matching MAX_VISIBLE_ROWS * DESKTOP_COLUMNS slots — beyond that,
  // the last slot becomes a "+{n} mais" toggle instead of "+ Novo" until
  // expanded.
  private readonly maxCollapsedSlots = MAX_VISIBLE_ROWS * DESKTOP_COLUMNS;

  readonly isOverflowing = computed(() => this.children().length + 1 > this.maxCollapsedSlots);

  readonly visibleChildren = computed(() => {
    const all = this.children();
    if (this.stripExpanded() || !this.isOverflowing()) {
      return all;
    }
    return all.slice(0, this.maxCollapsedSlots - 1);
  });

  readonly hiddenCount = computed(() => this.children().length - this.visibleChildren().length);

  accentFor(id: string): string {
    return getLocationAccent(id);
  }

  countFor(id: string): number {
    const descendantIds = this.locationsService.descendantIds(id)();
    return countCardsInLocations(this.cardService.cards(), [id, ...descendantIds]);
  }

  expand(): void {
    this.stripExpanded.set(true);
  }
}

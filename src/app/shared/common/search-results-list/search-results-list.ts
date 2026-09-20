import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardEntry } from '@models/card.model';

export interface CollectionSearchRow {
  card: CardEntry;
  locationId: string;
  locationPath: string;
  printColor: string;
}

export interface LocationChip {
  id: string;
  name: string;
  count: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'app-search-results-list',
  styleUrl: './search-results-list.scss',
  templateUrl: './search-results-list.html',
})
export class SearchResultsList {
  readonly rows = input.required<CollectionSearchRow[]>();
  readonly chips = input.required<LocationChip[]>();
  readonly locationFilter = input<string | null>(null);
  readonly query = input('');

  readonly filterChange = output<string | null>();
  readonly back = output<void>();
}

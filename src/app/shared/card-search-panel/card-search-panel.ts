import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CardLookupResult } from '@services/card-lookup.service';
import { CardScanCapture } from '../card-scan-capture/card-scan-capture';

export type CardSearchMode = 'name' | 'setCode';

const NAME_SEARCH_MIN_LENGTH = 3;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardScanCapture],
  selector: 'app-card-search-panel',
  styleUrl: './card-search-panel.scss',
  templateUrl: './card-search-panel.html',
})
export class CardSearchPanel {
  readonly searchMode = input.required<CardSearchMode>();
  readonly nameQuery = input.required<string>();
  readonly setCodeInput = input.required<string>();
  readonly collectorNumberInput = input.required<string>();
  readonly results = input.required<CardLookupResult[]>();
  readonly searching = input(false);
  readonly hasSearched = input(false);
  readonly searchError = input<string | null>(null);
  readonly ocrHelperMessage = input<string | null>(null);

  readonly searchModeChanged = output<CardSearchMode>();
  readonly nameQueryChanged = output<string>();
  readonly setCodeChanged = output<string>();
  readonly collectorNumberChanged = output<string>();
  readonly searchRequested = output<void>();
  readonly cameraCaptured = output<Blob>();
  readonly resultPicked = output<CardLookupResult>();

  readonly canSearch = computed(() =>
    this.searchMode() === 'name'
      ? this.nameQuery().trim().length >= NAME_SEARCH_MIN_LENGTH
      : this.setCodeInput().trim() !== '' && this.collectorNumberInput().trim() !== '',
  );
}

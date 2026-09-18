import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ThemeService } from '@services/theme.service';
import { LeylineField } from '@shared/leyline-field/leyline-field';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LeylineField],
  selector: 'app-collection-header',
  styleUrl: './collection-header.scss',
  templateUrl: './collection-header.html',
  host: {
    '[style.--collection-header-primary]': 'themeService.roles().primary',
    '[style.--collection-header-primary-hover]': 'themeService.roles().primaryHover',
    '[style.--collection-header-accent]': 'themeService.roles().accent',
    '[style.--collection-header-accent-hover]': 'themeService.roles().accentHover',
    '[style.--collection-header-tertiary]': 'themeService.roles().tertiary',
    '[style.--collection-header-tertiary-hover]': 'themeService.roles().tertiaryHover',
  },
})
export class CollectionHeader {
  protected readonly themeService = inject(ThemeService);

  readonly totalCards = input.required<number>();
  readonly totalLocations = input.required<number>();
  readonly totalSublocations = input.required<number>();
  readonly query = input('');
  readonly hint = input('');

  // Intl formatting rather than Angular's DecimalPipe, which needs a
  // registered locale — the app has no locale registration set up, and a
  // hardcoded 'pt-BR' pipe locale would throw at runtime without one.
  readonly totalCardsLabel = computed(() => this.totalCards().toLocaleString('pt-BR'));

  readonly queryChange = output<string>();
  readonly submitted = output<void>();
  readonly cleared = output<void>();
  readonly createLocation = output<void>();
}

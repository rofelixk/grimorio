import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CardEntry } from '@models/card.model';
import { getCardGlowColors } from '@utils/card-color.util';

export type CollectionViewMode = 'grid' | 'list';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-collection-card-grid',
  styleUrl: './collection-card-grid.scss',
  templateUrl: './collection-card-grid.html',
})
export class CollectionCardGrid {
  readonly cards = input.required<CardEntry[]>();
  readonly viewMode = input.required<CollectionViewMode>();
  readonly filterQuery = input('');
  readonly filtersActive = input(false);

  readonly remove = output<string>();
  readonly addRequested = output<void>();
  readonly queryCleared = output<void>();
  readonly filtersCleared = output<void>();
  readonly cardSelected = output<CardEntry>();

  // Set once (not rerolled on every filter keystroke) so the scatter spread
  // doesn't visibly jitter while typing — only the array's contents/order
  // change as the user filters/sorts, not the per-slot seed.
  readonly gridSeed = signal(Math.random() * 1000);

  glowColors(card: CardEntry): string[] {
    return getCardGlowColors(card.colorIdentity);
  }

  isMulticolor(card: CardEntry): boolean {
    return card.colorIdentity.length >= 2 && card.colorIdentity.length <= 3;
  }

  removeCard(id: string): void {
    this.remove.emit(id);
  }

  selectCard(card: CardEntry): void {
    this.cardSelected.emit(card);
  }
}

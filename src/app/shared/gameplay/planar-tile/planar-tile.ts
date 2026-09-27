import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { PlanarCard } from '../../../core/data/planechase/planar-card.model';
import { PLANAR_CARD } from '@utils/planechase-copy';
import { PlanarImage } from '@shared/gameplay/planar-image/planar-image';

// A deck-settings tile (DESIGN.md "Card tile"): the card image as an on/off toggle, loaded only
// near the viewport. Without an image, the frame shows the card name (FR-017).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planar-tile',
  imports: [PlanarImage],
  templateUrl: './planar-tile.html',
  styleUrl: './planar-tile.scss',
})
export class PlanarTile {
  readonly card = input.required<PlanarCard>();
  readonly on = input.required<boolean>();
  readonly toggled = output<void>();

  protected readonly label = computed(
    () => `${this.card().name}, ${this.card().kind === 'phenomenon' ? PLANAR_CARD.phenomenon : PLANAR_CARD.plane}`,
  );
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PlanarCard } from '../../../core/data/planechase/planar-card.model';
import { planarCardText } from '@utils/planar-card-text.util';
import { DECK } from '@utils/planechase-copy';
import { PlanarImage } from '@shared/gameplay/planar-image/planar-image';

// The card preview's reading surface (DESIGN.md "Card preview"), shared by the hover popover and
// both dialog variants: the image, then the status row, name, type line, text and the ability
// plate, never lit. `compact` stacks everything (popover, narrow dialog); `wide` puts the image
// beside a text column that scrolls within the host's height. Holds nothing focusable.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planar-preview',
  imports: [PlanarImage],
  templateUrl: './planar-preview.html',
  styleUrl: './planar-preview.scss',
  host: { '[class]': 'size()' },
})
export class PlanarPreviewContent {
  readonly card = input.required<PlanarCard>();
  readonly on = input.required<boolean>();
  readonly size = input<'compact' | 'wide'>('compact');
  /** The name's id, for a dialog's `aria-labelledby`. */
  readonly headingId = input<string | null>(null);

  protected readonly copy = DECK;
  protected readonly content = computed(() => planarCardText(this.card()));
}

import { ChangeDetectionStrategy, Component, ElementRef, computed, input, viewChild } from '@angular/core';
import type { PlanarCard as Card } from '@data/planechase/planar-card.model';
import { planarCardText } from '@utils/planar-card-text.util';
import { PlanarImage } from '@shared/gameplay/planar-image/planar-image';

// The face-up card (DESIGN.md "Card block"): image, English name, type line, static text and the
// chaos or encounter plate, lit per FR-011. A card with no up-to-date translation shows its
// English text marked `lang="en"` (FR-004a, FR-023). The host is the planeswalk flair's target.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planar-card',
  imports: [PlanarImage],
  templateUrl: './planar-card.html',
  styleUrl: './planar-card.scss',
})
export class PlanarCard {
  readonly card = input.required<Card>();
  readonly lit = input(false);

  private readonly content = computed(() => planarCardText(this.card()));
  protected readonly lang = computed(() => this.content().lang);
  protected readonly text = computed(() => this.content().text);
  protected readonly ability = computed(() => this.content().ability);
  protected readonly plateLabel = computed(() => this.content().plateLabel);

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  /** The image frame: the chaos flair's target. */
  imageFrame(): HTMLElement {
    return this.frame().nativeElement;
  }
}

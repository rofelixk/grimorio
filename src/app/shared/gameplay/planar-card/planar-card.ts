import { ChangeDetectionStrategy, Component, ElementRef, computed, input, viewChild } from '@angular/core';
import type { PlanarCard as Card } from '../../../core/data/planechase/planar-card.model';
import { PLANAR_CARD } from '@utils/planechase-copy';
import { PlanarImage } from '@shared/gameplay/planar-image/planar-image';

const lines = (text: string) => text.split('\n').filter((line) => line.trim() !== '');

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

  protected readonly copy = PLANAR_CARD;
  protected readonly lang = computed(() => (this.card().translated ? null : 'en'));
  protected readonly text = computed(() => lines(this.card().text));
  protected readonly ability = computed(() => {
    const ability = this.card().ability;
    return ability === null ? null : lines(ability);
  });
  protected readonly plateLabel = computed(() =>
    this.card().kind === 'phenomenon' ? PLANAR_CARD.encounter : PLANAR_CARD.chaos,
  );

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  /** The image frame: the chaos flair's target. */
  imageFrame(): HTMLElement {
    return this.frame().nativeElement;
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { PlanarCard } from '@data/planechase/planar-card.model';
import { TUNNEL } from '@utils/planechase-copy';
import { PlanarImage } from '@shared/gameplay/planar-image/planar-image';

let nextId = 0;

// Interplanar Tunnel's choice: the planes it revealed from the planar deck, as a radio group of
// card images. The arrow keys move the choice (roving tabindex, like native radios); the table
// confirms it with the console's or the dock's "Concluir encontro".
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tunnel-choice',
  imports: [PlanarImage],
  templateUrl: './tunnel-choice.html',
  styleUrl: './tunnel-choice.scss',
})
export class TunnelChoice {
  readonly planes = input.required<readonly PlanarCard[]>();
  readonly selected = input<string | null>(null);
  readonly picked = output<string>();

  protected readonly labelId = `grm-tunnel-label-${nextId++}`;
  protected readonly label = computed(() => TUNNEL.label(this.planes().length));
  /** The one radio in the tab order: the chosen plane, else the first. */
  protected readonly focusIndex = computed(() =>
    Math.max(
      0,
      this.planes().findIndex((card) => card.id === this.selected()),
    ),
  );

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const last = this.planes().length - 1;
    const target = (() => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          return index === last ? 0 : index + 1;
        case 'ArrowLeft':
        case 'ArrowUp':
          return index === 0 ? last : index - 1;
        case 'Home':
          return 0;
        case 'End':
          return last;
        default:
          return null;
      }
    })();
    if (target === null) {
      return;
    }
    event.preventDefault();
    this.picked.emit(this.planes()[target].id);
    const group = (event.currentTarget as HTMLElement).parentElement;
    (group?.children[target] as HTMLElement | undefined)?.focus();
  }
}

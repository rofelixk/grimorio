import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { RovingRadios } from '@shared/ds/roving-radios';
import { CARD } from '@utils/card-copy';

type Mode = 'images' | 'details';

// The collection page's display toggle (DESIGN.md "Cards" → "Display toggle"): a radio group with
// roving tabindex. Roving tabindex and aria-checked stay here in the template, the keys in RovingRadios.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-card-view-toggle',
  imports: [RovingRadios],
  templateUrl: './card-view-toggle.html',
  styleUrl: './card-view-toggle.scss',
})
export class CardViewToggle {
  readonly mode = model.required<Mode>();

  protected readonly copy = CARD;
  protected readonly options: readonly { mode: Mode; label: string }[] = [
    { mode: 'images', label: CARD.viewImages },
    { mode: 'details', label: CARD.viewDetails },
  ];
  protected readonly selectedIndex = computed(() => this.options.findIndex((o) => o.mode === this.mode()));
}

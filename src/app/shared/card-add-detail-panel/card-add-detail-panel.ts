import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CardCondition, CardFinish } from '@models/card.model';
import { CardLookupResult } from '@services/card-lookup.service';

const FINISHES: CardFinish[] = ['nonfoil', 'foil', 'etched'];
const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-card-add-detail-panel',
  styleUrl: './card-add-detail-panel.scss',
  templateUrl: './card-add-detail-panel.html',
})
export class CardAddDetailPanel {
  readonly finishes = FINISHES;
  readonly conditions = CONDITIONS;

  readonly candidate = input.required<CardLookupResult>();

  readonly finish = input<CardFinish | ''>('');
  readonly language = input('');
  readonly condition = input<CardCondition | ''>('');
  readonly quantity = input('');
  readonly forSale = input(false);
  readonly notes = input('');

  readonly finishChanged = output<CardFinish | ''>();
  readonly languageChanged = output<string>();
  readonly conditionChanged = output<CardCondition | ''>();
  readonly quantityChanged = output<string>();
  readonly forSaleChanged = output<boolean>();
  readonly notesChanged = output<string>();

  readonly confirm = output<void>();
}

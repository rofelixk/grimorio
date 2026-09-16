import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { CardCondition, CardFace, CardFinish } from '@models/card.model';
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

  readonly back = output<void>();
  readonly confirm = output<void>();
  readonly confirmAndContinue = output<void>();

  readonly faceIndex = linkedSignal({ source: this.candidate, computation: () => 0 });

  readonly displayedFace = computed<CardFace>(() => {
    const candidate = this.candidate();
    const faces = candidate.faces;
    if (faces && faces.length > 1) {
      return faces[this.faceIndex() % faces.length];
    }
    return { name: candidate.name, imageUrl: candidate.imageUrl };
  });

  flipFace(): void {
    const faces = this.candidate().faces;
    if (!faces || faces.length < 2) return;
    this.faceIndex.update((i) => (i + 1) % faces.length);
  }

  decrementQuantity(): void {
    const next = Math.max(1, (Number(this.quantity()) || 1) - 1);
    this.quantityChanged.emit(String(next));
  }

  incrementQuantity(): void {
    const next = Math.max(1, (Number(this.quantity()) || 1) + 1);
    this.quantityChanged.emit(String(next));
  }
}

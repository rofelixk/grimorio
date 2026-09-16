import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { CardCondition, CardFace, CardFinish } from '@models/card.model';
import { CardLookupResult, CardLookupService } from '@services/card-lookup.service';

const FINISHES: CardFinish[] = ['nonfoil', 'foil', 'etched'];
const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG'];
const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'Inglês (EN)' },
  { code: 'ct', label: 'Cantonês (CT)' },
  { code: 'de', label: 'Alemão (DE)' },
  { code: 'fr', label: 'Francês (FR)' },
  { code: 'it', label: 'Italiano (IT)' },
  { code: 'jp', label: 'Japonês (JP)' },
  { code: 'kr', label: 'Koreano (KR)' },
  { code: 'pt', label: 'Português (PT)' },
  { code: 'ru', label: 'Russo (RU)' },
  { code: 'cs', label: 'Chinês simplificado (CS)' },
  { code: 'sp', label: 'Espanhol (SP)' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-card-add-detail-panel',
  styleUrl: './card-add-detail-panel.scss',
  templateUrl: './card-add-detail-panel.html',
})
export class CardAddDetailPanel {
  private readonly cardLookup = inject(CardLookupService);

  readonly finishes = FINISHES;
  readonly conditions = CONDITIONS;
  readonly languages = LANGUAGES;

  readonly candidate = input.required<CardLookupResult>();

  readonly finish = input<CardFinish | ''>('');
  readonly language = input('en');
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

  readonly printingSelected = output<CardLookupResult>();

  readonly printingOptions = signal<CardLookupResult[]>([]);

  constructor() {
    effect(() => {
      const candidate = this.candidate();
      this.printingOptions.set([candidate]);

      this.cardLookup.listPrintings(candidate.oracleId).then(
        (printings) => {
          // Ignore a stale response from a printing/card we've since moved on from.
          if (this.candidate().oracleId === candidate.oracleId && printings.length > 0) {
            this.printingOptions.set(printings);
          }
        },
        () => {
          // Non-critical enhancement — keep showing just the current printing.
        },
      );
    });
  }

  readonly faceIndex = linkedSignal({ source: this.candidate, computation: () => 0 });

  readonly displayedFace = computed<CardFace>(() => {
    const candidate = this.candidate();
    const faces = candidate.faces;
    if (faces && faces.length > 1) {
      return faces[this.faceIndex() % faces.length];
    }
    return { name: candidate.name, imageUrl: candidate.imageUrl };
  });

  onPrintingChange(scryfallId: string): void {
    const option = this.printingOptions().find((p) => p.scryfallId === scryfallId);
    if (option) {
      this.printingSelected.emit(option);
    }
  }

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

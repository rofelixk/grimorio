import { Component, inject, output, signal } from '@angular/core';
import { CardCondition, CardEntry, CardFinish } from '../../core/models/card.model';
import { CardLookupResult, CardLookupService } from '../../core/services/card-lookup.service';

const FINISHES: CardFinish[] = ['nonfoil', 'foil', 'etched'];
const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG'];

@Component({
  imports: [],
  selector: 'app-add-card-form',
  styleUrl: './add-card-form.scss',
  templateUrl: './add-card-form.html',
})
export class AddCardForm {
  private readonly cardLookup = inject(CardLookupService);

  readonly finishes = FINISHES;
  readonly conditions = CONDITIONS;

  readonly cardAdded = output<Omit<CardEntry, 'id' | 'locationId'>>();

  readonly setCode = signal('');
  readonly collectorNumber = signal('');
  readonly generating = signal(false);
  readonly lookupError = signal<string | null>(null);
  readonly generated = signal<CardLookupResult | null>(null);

  readonly finish = signal<CardFinish | ''>('');
  readonly language = signal('');
  readonly condition = signal<CardCondition | ''>('');
  readonly quantity = signal('');
  readonly forSale = signal(false);
  readonly notes = signal('');

  async generate(): Promise<void> {
    const setCode = this.setCode().trim();
    const collectorNumber = this.collectorNumber().trim();
    if (!setCode || !collectorNumber) {
      this.lookupError.set('Enter a set code and collector number first.');
      return;
    }

    this.generating.set(true);
    this.lookupError.set(null);
    try {
      const result = await this.cardLookup.lookup(setCode, collectorNumber);
      this.generated.set(result);
    } catch {
      this.lookupError.set('Could not look up that card. Please try again.');
    } finally {
      this.generating.set(false);
    }
  }

  submit(): void {
    const generated = this.generated();
    if (!generated) {
      return;
    }

    this.cardAdded.emit({
      ...generated,
      setCode: this.setCode().trim().toUpperCase(),
      collectorNumber: this.collectorNumber().trim(),
      finish: this.finish() || 'nonfoil',
      language: this.language().trim() || 'en',
      condition: this.condition() || 'NM',
      quantity: Number(this.quantity()) || 1,
      forSale: this.forSale(),
      notes: this.notes().trim() || undefined,
    });

    this.reset();
  }

  private reset(): void {
    this.setCode.set('');
    this.collectorNumber.set('');
    this.generated.set(null);
    this.lookupError.set(null);
    this.finish.set('');
    this.language.set('');
    this.condition.set('');
    this.quantity.set('');
    this.forSale.set(false);
    this.notes.set('');
  }
}

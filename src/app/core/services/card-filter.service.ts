import { Injectable, computed, signal } from '@angular/core';
import { CardCondition, CardEntry, CardFinish, CardRarity, Color } from '@models/card.model';

export interface CardFilters {
  colors: Color[];
  colorless: boolean;
  colorMatch: 'any' | 'exact';
  forSale: boolean;
  rarity: CardRarity | '';
  finish: CardFinish | '';
  condition: CardCondition | '';
  setCode: string;
  type: string;
}

export const EMPTY_FILTERS: CardFilters = {
  colors: [],
  colorless: false,
  colorMatch: 'any',
  forSale: false,
  rarity: '',
  finish: '',
  condition: '',
  setCode: '',
  type: '',
};

function matchesColor(card: CardEntry, f: CardFilters): boolean {
  const hasColors = f.colors.length > 0;
  if (!f.colorless && !hasColors) {
    return true;
  }

  if (f.colorMatch === 'any') {
    return (f.colorless && card.colorIdentity.length === 0) || f.colors.some((c) => card.colorIdentity.includes(c));
  }

  // exact
  if (!hasColors) {
    // colorless-only exact match
    return card.colorIdentity.length === 0;
  }
  return card.colorIdentity.length === f.colors.length && f.colors.every((c) => card.colorIdentity.includes(c));
}

export function applyCardFilters(cards: CardEntry[], f: CardFilters): CardEntry[] {
  return cards.filter((card) => {
    if (f.forSale && !card.forSale) {
      return false;
    }
    if (f.rarity && card.rarity !== f.rarity) {
      return false;
    }
    if (f.finish && card.finish !== f.finish) {
      return false;
    }
    if (f.condition && card.condition !== f.condition) {
      return false;
    }
    if (f.setCode && card.setCode !== f.setCode) {
      return false;
    }
    if (f.type && !card.typeLine.toLowerCase().includes(f.type.toLowerCase())) {
      return false;
    }
    if (!matchesColor(card, f)) {
      return false;
    }
    return true;
  });
}

@Injectable({ providedIn: 'root' })
export class CardFilterService {
  readonly filters = signal<CardFilters>(EMPTY_FILTERS);
  readonly panelOpen = signal(false);
  readonly openMenu = signal<string>('');

  readonly activeCount = computed(() => {
    const f = this.filters();
    let count = 0;
    if (f.colors.length > 0 || f.colorless) {
      count++;
    }
    if (f.forSale) {
      count++;
    }
    if (f.rarity) {
      count++;
    }
    if (f.finish) {
      count++;
    }
    if (f.condition) {
      count++;
    }
    if (f.setCode) {
      count++;
    }
    if (f.type) {
      count++;
    }
    return count;
  });

  readonly isActive = computed(() => this.activeCount() > 0);

  apply(cards: CardEntry[], f: CardFilters = this.filters()): CardEntry[] {
    return applyCardFilters(cards, f);
  }

  reset(): void {
    this.filters.set(EMPTY_FILTERS);
  }

  setField<K extends keyof CardFilters>(key: K, value: CardFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }

  toggleColor(c: Color): void {
    this.filters.update((f) => {
      const colors = f.colors.includes(c) ? f.colors.filter((x) => x !== c) : [...f.colors, c];
      return { ...f, colors };
    });
  }
}

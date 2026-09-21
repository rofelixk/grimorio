import { Injectable, computed, signal } from '@angular/core';
import { CardCondition, CardEntry, CardFinish, CardRarity, Color } from '@models/card.model';

export interface CardFilters {
  colors: Color[];
  colorless: boolean;
  colorMatch: 'any' | 'exact';
  forSale: boolean;
  rarity: CardRarity[];
  finish: CardFinish[];
  condition: CardCondition[];
  type: string[];
}

export const EMPTY_FILTERS: CardFilters = {
  colors: [],
  colorless: false,
  colorMatch: 'any',
  forSale: false,
  rarity: [],
  finish: [],
  condition: [],
  type: [],
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
    if (f.rarity.length > 0 && !f.rarity.includes(card.rarity)) {
      return false;
    }
    if (f.finish.length > 0 && !f.finish.includes(card.finish)) {
      return false;
    }
    if (f.condition.length > 0 && !f.condition.includes(card.condition)) {
      return false;
    }
    if (f.type.length > 0 && !f.type.some((t) => card.typeLine.toLowerCase().includes(t.toLowerCase()))) {
      return false;
    }
    if (!matchesColor(card, f)) {
      return false;
    }
    return true;
  });
}

export type ListField = 'rarity' | 'finish' | 'condition' | 'type';
export const LIST_FIELDS: ListField[] = ['rarity', 'finish', 'condition', 'type'];

@Injectable({ providedIn: 'root' })
export class CardFilterService {
  readonly filters = signal<CardFilters>(EMPTY_FILTERS);
  readonly panelOpen = signal(false);
  readonly openMenu = signal<string>('');

  readonly activeCount = computed(() => {
    const f = this.filters();
    const listFieldsActive = LIST_FIELDS.filter((key) => f[key].length > 0).length;
    return listFieldsActive + (f.colors.length > 0 || f.colorless ? 1 : 0) + (f.forSale ? 1 : 0);
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

  // Toggles a single value's membership in one of the multi-select list
  // fields (rarity/finish/condition/type) — used by CollectionFilters'
  // dropdowns, which allow more than one option to be active at once.
  toggleListOption(key: ListField, value: string): void {
    this.filters.update((f) => {
      const list = f[key] as string[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...f, [key]: next } as CardFilters;
    });
  }

  clearListField(key: ListField): void {
    this.filters.update((f) => ({ ...f, [key]: [] }));
  }
}

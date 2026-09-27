import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { ResolveFn } from '@angular/router';
import type {
  PlanarCard,
  PlanarCardData,
  PlanarSet,
  PlanarTranslations,
} from '../data/planechase/planar-card.model';
import { PlanechaseGameService } from './planechase-game.service';

export interface PlanechaseData {
  cards: PlanarCardData;
  translations: PlanarTranslations;
}

/**
 * Loads the shipped card data. Always a dynamic `import()`, never a static one, so both JSON files
 * stay in one lazy chunk out of the initial bundle (R4). Specs provide fixtures instead.
 */
export const PLANECHASE_DATA = new InjectionToken<() => Promise<PlanechaseData>>('PLANECHASE_DATA', {
  providedIn: 'root',
  factory: () => async () => {
    const [cards, translations] = await Promise.all([
      import('../data/planechase/cards.json'),
      import('../data/planechase/cards.pt-br.json'),
    ]);
    return {
      cards: cards.default as PlanarCardData,
      translations: translations.default as PlanarTranslations,
    };
  },
});

/** The PT-BR text only when the translation was made from the current English (FR-004a). */
export function buildCatalog({ cards, translations }: PlanechaseData): PlanarCard[] {
  return cards.cards.map((card) => {
    const translation = translations[card.id];
    const fresh = translation?.sourceHash === card.hash ? translation : undefined;
    return {
      id: card.id,
      name: card.name,
      kind: card.kind,
      set: { code: card.set.code, name: card.set.name },
      images: card.images,
      typeLine: fresh?.typeLine ?? card.typeLine,
      text: fresh?.text ?? card.text,
      ability: fresh ? fresh.ability : card.ability,
      translated: !!fresh,
    };
  });
}

function groupSets(cards: readonly PlanarCard[]): PlanarSet[] {
  const sets = new Map<string, PlanarSet>();
  for (const card of cards) {
    let set = sets.get(card.set.code);
    if (!set) {
      set = { code: card.set.code, name: card.set.name, cards: [] };
      sets.set(card.set.code, set);
    }
    set.cards.push(card);
  }
  return [...sets.values()];
}

// The Planechase card catalog: the shipped cards with their reviewed PT-BR text (FR-003, FR-004).
// Loaded once, on the first Planechase route, through planechaseCatalogResolver.
@Injectable({ providedIn: 'root' })
export class PlanechaseCatalogService {
  private readonly loadData = inject(PLANECHASE_DATA);
  private readonly cardsSignal = signal<readonly PlanarCard[]>([]);
  /** Every card, in file order (newest set first). */
  readonly cards = this.cardsSignal.asReadonly();
  /** Cards grouped by set, in file order. */
  readonly sets = computed(() => groupSets(this.cards()));
  private readonly index = computed(() => new Map(this.cards().map((card) => [card.id, card])));

  private loading: Promise<void> | null = null;

  load(): Promise<void> {
    this.loading ??= this.loadData().then(
      (data) => this.cardsSignal.set(buildCatalog(data)),
      (error: unknown) => {
        this.loading = null;
        throw error;
      },
    );
    return this.loading;
  }

  byId(id: string): PlanarCard | undefined {
    return this.index().get(id);
  }

  readonly kindOf = (id: string): PlanarCard['kind'] => this.byId(id)?.kind ?? 'plane';
}

/** On every Planechase route: views read the catalog synchronously, and a saved game is repaired. */
export const planechaseCatalogResolver: ResolveFn<void> = async () => {
  const catalog = inject(PlanechaseCatalogService);
  const game = inject(PlanechaseGameService);
  await catalog.load();
  game.repairIfNeeded();
};

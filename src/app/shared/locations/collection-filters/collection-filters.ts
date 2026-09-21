import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CardFilters, CardFilterService, ListField, applyCardFilters } from '@services/card-filter.service';
import { CardEntry, CardRarity, Color } from '@models/card.model';
import { CardService } from '@services/card.service';
import { ThemeService } from '@services/theme.service';
import { COLORLESS_GLOW, MTG_PRINT_COLORS } from '@utils/card-color.util';
import { FilterOption, FilterSelect } from '@shared/common/filter-select/filter-select';

interface OptionMap {
  rarity: FilterOption[];
  finish: FilterOption[];
  condition: FilterOption[];
  type: FilterOption[];
}

const RARITY_GEMS: Partial<Record<CardRarity, { code: string; tint: string }>> = {
  common: { code: 'C', tint: '#a89e96' },
  uncommon: { code: 'U', tint: '#c9d1d9' },
  rare: { code: 'R', tint: '#d4af37' },
  mythic: { code: 'M', tint: '#d3202a' },
};

const RARITY_BASE: { value: CardRarity; label: string }[] = [
  { value: 'common', label: 'Comum' },
  { value: 'uncommon', label: 'Incomum' },
  { value: 'rare', label: 'Rara' },
  { value: 'mythic', label: 'Mítica' },
];

// Not spec'd in the design handoff (only the 4 standard rarities are
// shown) — folded in dynamically, only when a card in the location
// actually has one, per the handoff's "fold them into the panel if they
// appear in the user's data" instruction.
const RARITY_EXTRA: { value: CardRarity; label: string }[] = [
  { value: 'special', label: 'Especial' },
  { value: 'bonus', label: 'Bônus' },
];

const FINISH_OPTIONS = [
  { value: 'nonfoil', label: 'Nonfoil' },
  { value: 'foil', label: 'Foil' },
  { value: 'etched', label: 'Etched' },
];

const CONDITION_OPTIONS = [
  { value: 'NM', label: 'NM — Near Mint' },
  { value: 'LP', label: 'LP — Levemente Jogada' },
  { value: 'MP', label: 'MP — Moderadamente Jogada' },
  { value: 'HP', label: 'HP — Muito Jogada' },
  { value: 'DMG', label: 'DMG — Danificada' },
];

// finish/condition are both plain "one static option list, tallied by
// equality" fields (unlike rarity, which folds in dynamic RARITY_EXTRA
// entries and per-value gem art, or type, which matches by substring) —
// driven through one shared loop below instead of a copy-pasted block each.
const SIMPLE_LIST_FIELDS: {
  field: 'finish' | 'condition';
  options: { value: string; label: string }[];
  allLabel: string;
}[] = [
  { field: 'finish', options: FINISH_OPTIONS, allLabel: 'Todos' },
  { field: 'condition', options: CONDITION_OPTIONS, allLabel: 'Todas' },
];

// value = the English typeLine substring applyCardFilters's `type`
// predicate checks against (card.typeLine.toLowerCase().includes(...)) —
// the pt-BR label is UI-only.
const TYPE_OPTIONS = [
  { value: 'Creature', label: 'Criatura' },
  { value: 'Instant', label: 'Instantânea' },
  { value: 'Sorcery', label: 'Feitiço' },
  { value: 'Artifact', label: 'Artefato' },
  { value: 'Enchantment', label: 'Encantamento' },
  { value: 'Land', label: 'Terreno' },
];

const COLOR_PIPS: { code: Color; label: string; print: string }[] = [
  { code: 'W', label: 'Branco', print: MTG_PRINT_COLORS.W },
  { code: 'U', label: 'Azul', print: MTG_PRINT_COLORS.U },
  { code: 'B', label: 'Preto', print: MTG_PRINT_COLORS.B },
  { code: 'R', label: 'Vermelho', print: MTG_PRINT_COLORS.R },
  { code: 'G', label: 'Verde', print: MTG_PRINT_COLORS.G },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterSelect],
  selector: 'app-collection-filters',
  styleUrl: './collection-filters.scss',
  templateUrl: './collection-filters.html',
  host: {
    '[style.--collection-filters-primary]': 'themeService.roles().primary',
    '[style.--collection-filters-primary-hover]': 'themeService.roles().primaryHover',
    '[style.--collection-filters-accent]': 'themeService.roles().accent',
    '[style.--collection-filters-accent-hover]': 'themeService.roles().accentHover',
    '[style.--collection-filters-tertiary]': 'themeService.roles().tertiary',
    '[style.--collection-filters-tertiary-hover]': 'themeService.roles().tertiaryHover',
  },
})
export class CollectionFilters {
  protected readonly filterService = inject(CardFilterService);
  private readonly cardService = inject(CardService);
  protected readonly themeService = inject(ThemeService);

  readonly locationId = input.required<string>();

  protected readonly colorlessPrint = COLORLESS_GLOW;
  protected readonly colorPips = COLOR_PIPS;

  readonly cardsHere = computed(() =>
    this.cardService.cards().filter((card) => card.locationId === this.locationId()),
  );

  // One computed producing the whole option map for all 4 dropdowns at
  // once — each option's count reflects that single value on its own
  // (ignoring whatever else is already picked in the same field) while
  // every OTHER active filter is held as-is, so an option's number stays
  // stable no matter what else in that same dropdown is selected.
  // Memoised here rather than recomputed per-option-per-render, since
  // that would rerun applyCardFilters dozens of times on every
  // keystroke/toggle. Per field, one applyCardFilters pass computes the
  // subset matching every OTHER filter (this field cleared), then each
  // option's count comes from tallying that subset instead of re-running
  // the whole filter chain per option value.
  protected readonly optionMap = computed<OptionMap>(() => {
    const cards = this.cardsHere();
    const filters = this.filterService.filters();

    const subsetFor = (field: ListField): CardEntry[] =>
      applyCardFilters(cards, { ...filters, [field]: [] } as CardFilters);

    const tally = (subset: CardEntry[], accessor: (card: CardEntry) => string): Map<string, number> => {
      const counts = new Map<string, number>();
      for (const card of subset) {
        const key = accessor(card);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return counts;
    };

    const rarityValues = [...RARITY_BASE];
    for (const extra of RARITY_EXTRA) {
      if (cards.some((c) => c.rarity === extra.value)) {
        rarityValues.push(extra);
      }
    }

    const raritySubset = subsetFor('rarity');
    const rarityCounts = tally(raritySubset, (c) => c.rarity);
    const rarity: FilterOption[] = [
      { value: '', label: 'Todas as raridades', count: raritySubset.length },
      ...rarityValues.map((o) => ({
        value: o.value,
        label: o.label,
        count: rarityCounts.get(o.value) ?? 0,
        gem: RARITY_GEMS[o.value],
      })),
    ];

    const [finish, condition] = SIMPLE_LIST_FIELDS.map(({ field, options, allLabel }) => {
      const subset = subsetFor(field);
      const counts = tally(subset, (c) => c[field]);
      const list: FilterOption[] = [
        { value: '', label: allLabel, count: subset.length },
        ...options.map((o) => ({ value: o.value, label: o.label, count: counts.get(o.value) ?? 0 })),
      ];
      return list;
    });

    // Type matching is substring-based (typeLine.includes), not equality, so
    // it can't be tallied via a single Map the way the other fields are —
    // it still benefits from the shared subset, computed once above.
    const typeSubset = subsetFor('type');
    const type: FilterOption[] = [
      { value: '', label: 'Todos os tipos', count: typeSubset.length },
      ...TYPE_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        count: typeSubset.filter((c) => c.typeLine.toLowerCase().includes(o.value.toLowerCase())).length,
      })),
    ];

    return { rarity, finish, condition, type };
  });

  readonly totalCount = computed(() => this.cardsHere().length);
  readonly resultCount = computed(() => this.filterService.apply(this.cardsHere()).length);

  togglePanel(): void {
    this.filterService.panelOpen.update((v) => !v);
  }

  isColorSelected(code: Color): boolean {
    return this.filterService.filters().colors.includes(code);
  }

  toggleColor(code: Color): void {
    this.filterService.toggleColor(code);
  }

  toggleColorless(): void {
    this.filterService.setField('colorless', !this.filterService.filters().colorless);
  }

  setColorMatch(mode: 'any' | 'exact'): void {
    this.filterService.setField('colorMatch', mode);
  }

  toggleForSale(): void {
    this.filterService.setField('forSale', !this.filterService.filters().forSale);
  }

  toggleMenu(field: ListField): void {
    this.filterService.openMenu.update((current) => (current === field ? '' : field));
  }

  // Only closes the menu that requested it — a FilterSelect's dismiss
  // listener can fire with a stale `open` input (it reads a signal input,
  // which only refreshes on that component's next change-detection pass,
  // not synchronously within the same click-bubble that opened a sibling
  // menu), so an unconditional set('') here can clobber a menu that was
  // just opened by the same click.
  closeMenu(field: ListField): void {
    this.filterService.openMenu.update((current) => (current === field ? '' : current));
  }

  // Multi-select: picking a row toggles it without closing the dropdown,
  // so more than one option can be chosen in a row.
  toggleField(field: ListField, value: string): void {
    this.filterService.toggleListOption(field, value);
  }

  clearField(field: ListField): void {
    this.filterService.clearListField(field);
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CardFilters, CardFilterService, applyCardFilters } from '@services/card-filter.service';
import { CardRarity, Color } from '@models/card.model';
import { CardService } from '@services/card.service';
import { ThemeService } from '@services/theme.service';
import { COLORLESS_GLOW, MTG_PRINT_COLORS } from '@utils/card-color.util';
import { FilterOption, FilterSelect } from '@shared/common/filter-select/filter-select';

interface OptionMap {
  rarity: FilterOption[];
  finish: FilterOption[];
  condition: FilterOption[];
  setCode: FilterOption[];
  type: FilterOption[];
}

type DropdownField = 'rarity' | 'finish' | 'condition' | 'setCode' | 'type';

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

  // One computed producing the whole option map for all 5 dropdowns at
  // once — each option's count runs applyCardFilters over cardsHere()
  // with every OTHER active filter held as-is and only this field
  // swapped to that option's value. Memoised here rather than recomputed
  // per-option-per-render, since that would rerun applyCardFilters 30+
  // times on every keystroke/toggle.
  protected readonly optionMap = computed<OptionMap>(() => {
    const cards = this.cardsHere();
    const filters = this.filterService.filters();
    const countFor = (field: DropdownField, value: string): number =>
      applyCardFilters(cards, { ...filters, [field]: value } as CardFilters).length;

    const rarityValues = [...RARITY_BASE];
    for (const extra of RARITY_EXTRA) {
      if (cards.some((c) => c.rarity === extra.value)) {
        rarityValues.push(extra);
      }
    }

    const rarity: FilterOption[] = [
      { value: '', label: 'Todas as raridades', count: countFor('rarity', '') },
      ...rarityValues.map((o) => ({
        value: o.value,
        label: o.label,
        count: countFor('rarity', o.value),
        gem: RARITY_GEMS[o.value],
      })),
    ];

    const finish: FilterOption[] = [
      { value: '', label: 'Todos', count: countFor('finish', '') },
      ...FINISH_OPTIONS.map((o) => ({ value: o.value, label: o.label, count: countFor('finish', o.value) })),
    ];

    const condition: FilterOption[] = [
      { value: '', label: 'Todas', count: countFor('condition', '') },
      ...CONDITION_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        count: countFor('condition', o.value),
      })),
    ];

    const setCodes = Array.from(new Set(cards.map((c) => c.setCode))).sort((a, b) => a.localeCompare(b));
    const setCode: FilterOption[] = [
      { value: '', label: 'Todos os sets', count: countFor('setCode', '') },
      ...setCodes.map((code) => ({ value: code, label: code.toUpperCase(), count: countFor('setCode', code) })),
    ];

    const type: FilterOption[] = [
      { value: '', label: 'Todos os tipos', count: countFor('type', '') },
      ...TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label, count: countFor('type', o.value) })),
    ];

    return { rarity, finish, condition, setCode, type };
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

  toggleMenu(field: DropdownField): void {
    this.filterService.openMenu.update((current) => (current === field ? '' : field));
  }

  closeMenu(): void {
    this.filterService.openMenu.set('');
  }

  pickField(field: DropdownField, value: string): void {
    this.filterService.setField(field, value as CardFilters[DropdownField]);
    this.filterService.openMenu.set('');
  }
}

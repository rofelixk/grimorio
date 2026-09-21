import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output } from '@angular/core';
import { bindDropdownDismiss } from '@utils/dropdown-dismiss.util';
import { createPanelPlacementState } from '@utils/dropdown-placement.util';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
  gem?: { code: string; tint: string };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-filter-select',
  styleUrl: './filter-select.scss',
  templateUrl: './filter-select.html',
})
export class FilterSelect {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly label = input.required<string>();
  readonly values = input.required<string[]>();
  readonly placeholder = input.required<string>();
  readonly options = input<FilterOption[]>([]);
  readonly open = input(false);

  // Emitted when a real option (not the clear-all row) is clicked — the
  // panel stays open afterwards so more than one option can be picked.
  readonly picked = output<string>();
  // Emitted when the clear-all row (value '') is clicked.
  readonly cleared = output<void>();
  readonly toggled = output<void>();
  readonly closeRequested = output<void>();

  // Whether the panel should flip above the trigger, and the max height it's
  // allowed to take up — both computed right before opening, from how much
  // viewport space actually surrounds the trigger, so the panel never forces
  // the page to scroll.
  private readonly placement = createPanelPlacementState(this.elementRef, () => this.options().length);
  readonly panelUp = this.placement.panelUp;
  readonly panelMaxHeight = this.placement.panelMaxHeight;

  constructor() {
    bindDropdownDismiss(
      this.elementRef,
      () => this.open(),
      () => this.closeRequested.emit(),
    );
  }

  private readonly selectedSet = computed(() => new Set(this.values()));

  readonly selectedOptions = computed(() => {
    const selected = this.selectedSet();
    return this.options().filter((opt) => selected.has(opt.value));
  });

  readonly triggerLabel = computed(() => {
    const opts = this.selectedOptions();
    if (opts.length === 0) {
      return this.placeholder();
    }
    if (opts.length <= 2) {
      return opts.map((opt) => opt.label).join(', ');
    }
    return `${opts.length} selecionados`;
  });

  isSelected(option: FilterOption): boolean {
    return option.value === '' ? this.selectedSet().size === 0 : this.selectedSet().has(option.value);
  }

  pick(option: FilterOption): void {
    if (option.value === '') {
      this.cleared.emit();
    } else {
      this.picked.emit(option.value);
    }
  }

  onOptionKeydown(event: KeyboardEvent, option: FilterOption): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.pick(option);
    }
  }

  toggle(): void {
    if (!this.open()) {
      this.placement.updatePlacement();
    }
    this.toggled.emit();
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { bindDropdownDismiss } from '@utils/dropdown-dismiss.util';
import { createPanelPlacementState } from '@utils/dropdown-placement.util';

export interface SelectOption {
  value: string;
  label: string;
}

// Single-select counterpart to FilterSelect: same trigger/panel look and
// up/down flip behavior (shared via src/styles/_dropdown.scss and
// dropdown-placement.util.ts), but for a single plain value rather than a
// filter's multi-select-with-counts — picking an option closes the panel,
// and open/close state is owned locally rather than by a parent "only one
// menu open at a time" coordinator.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-select',
  styleUrl: './select.scss',
  templateUrl: './select.html',
})
export class Select {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly triggerButton = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly options = input.required<SelectOption[]>();

  readonly valueChange = output<string>();

  readonly open = signal(false);

  private readonly placement = createPanelPlacementState(this.elementRef, () => this.options().length);
  readonly panelUp = this.placement.panelUp;
  readonly panelMaxHeight = this.placement.panelMaxHeight;

  constructor() {
    bindDropdownDismiss(
      this.elementRef,
      () => this.open(),
      () => this.open.set(false),
    );
  }

  readonly selectedOption = computed(() => this.options().find((opt) => opt.value === this.value()));

  readonly triggerLabel = computed(() => this.selectedOption()?.label ?? '');

  toggle(): void {
    if (!this.open()) {
      this.placement.updatePlacement();
    }
    this.open.update((current) => !current);
  }

  pick(option: SelectOption): void {
    this.valueChange.emit(option.value);
    this.open.set(false);
    // The picked <li> unmounts as soon as the panel closes above — without
    // this, focus drops to <body> (unlike a native <select>, which keeps
    // focus on the control after a choice), breaking the tab order for a
    // keyboard user picking the next field.
    this.triggerButton().nativeElement.focus();
  }

  onOptionKeydown(event: KeyboardEvent, option: SelectOption): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.pick(option);
    }
  }
}

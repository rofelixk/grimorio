import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';

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
  readonly value = input.required<string>();
  readonly placeholder = input.required<string>();
  readonly options = input<FilterOption[]>([]);
  readonly open = input(false);

  readonly picked = output<string>();
  readonly toggled = output<void>();
  readonly closeRequested = output<void>();

  readonly selectedOption = computed(() => this.options().find((opt) => opt.value === this.value()));

  pick(option: FilterOption): void {
    this.picked.emit(option.value);
  }

  onOptionKeydown(event: KeyboardEvent, option: FilterOption): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.pick(option);
    }
  }

  toggle(): void {
    this.toggled.emit();
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.closeRequested.emit();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeRequested.emit();
    }
  }
}

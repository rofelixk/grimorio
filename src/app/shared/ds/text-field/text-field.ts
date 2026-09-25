import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, viewChild } from '@angular/core';

let nextId = 0;

// A labelled input per DESIGN.md "Inputs": label above, helper below (hidden while an error
// shows), field error directly under the field. Built on the global `.field` primitives.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-text-field',
  template: `
    <label class="field__label" [for]="id">{{ label() }}</label>
    <input
      #input
      class="field__input"
      [id]="id"
      [type]="type()"
      [value]="value()"
      [attr.name]="name()"
      [attr.autocomplete]="autocomplete()"
      [attr.inputmode]="inputmode()"
      [attr.maxlength]="maxlength()"
      [attr.placeholder]="placeholder()"
      [attr.aria-invalid]="error() ? 'true' : null"
      [attr.aria-describedby]="describedBy()"
      [readOnly]="readonly()"
      (input)="valueChange.emit(input.value)"
    />
    @if (error()) {
      <span class="field__error" [id]="id + '-error'">{{ error() }}</span>
    } @else if (helper()) {
      <span class="field__helper" [id]="id + '-helper'">{{ helper() }}</span>
    }
  `,
  host: { class: 'field' },
})
export class TextField {
  readonly label = input.required<string>();
  readonly value = input('');
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly name = input<string | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly inputmode = input<string | null>(null);
  readonly maxlength = input<number | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly helper = input('');
  readonly error = input<string | undefined>('');
  readonly readonly = input(false);
  readonly valueChange = output<string>();

  protected readonly id = `grm-field-${nextId++}`;
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly describedBy = computed(() =>
    this.error() ? `${this.id}-error` : this.helper() ? `${this.id}-helper` : null,
  );

  focus(): void {
    this.inputRef().nativeElement.focus();
  }
}

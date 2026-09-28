import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// The dashed "create" row (DESIGN.md "Collections" → "Dashed create row"): ends the list on phone,
// or opens a subcollection/split action inside a collection. Same size as a collection row.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-create-row',
  template: `
    <button type="button" class="row" (click)="activate.emit()">
      <span class="plus" aria-hidden="true">+</span>
      <span class="text">
        <span class="label">{{ label() }}</span>
        @if (sub()) {
          <span class="sub">{{ sub() }}</span>
        }
      </span>
    </button>
  `,
  styleUrl: './create-row.scss',
})
export class CreateRow {
  readonly label = input.required<string>();
  readonly sub = input('');
  readonly activate = output<void>();
}

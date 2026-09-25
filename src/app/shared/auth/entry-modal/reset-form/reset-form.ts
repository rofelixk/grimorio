import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FIELD } from '@utils/entry-copy';
import { TextField } from '@shared/ds/text-field/text-field';
import { EntryFlowStore } from '../entry-flow.store';

// Cloud password reset by 6-digit code (FR-022–FR-024): `reset-email`, then `reset-code`.
// The resend/other-e-mail actions sit under the primary button, in the modal.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-reset-form',
  imports: [TextField],
  template: `
    @if (store.phase() === 'reset-email') {
      <app-text-field
        [label]="field.email"
        type="email"
        name="email"
        autocomplete="email"
        [placeholder]="field.emailPlaceholder"
        [readonly]="store.emailLocked()"
        [value]="store.fields().email"
        [error]="store.fieldErrors().email"
        (valueChange)="store.editField('email', $event)"
      />
    } @else {
      <app-text-field
        [label]="field.code"
        name="code"
        autocomplete="one-time-code"
        inputmode="numeric"
        [maxlength]="6"
        [placeholder]="field.codePlaceholder"
        [value]="store.fields().code"
        [error]="store.fieldErrors().code"
        (valueChange)="store.editField('code', $event)"
      />
      <app-text-field
        [label]="store.pwLabel()"
        type="password"
        name="password"
        autocomplete="new-password"
        [value]="store.fields().pw"
        [helper]="store.pwHelper()"
        [error]="store.fieldErrors().pw"
        (valueChange)="store.editField('pw', $event)"
      />
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
  `,
})
export class ResetForm {
  protected readonly store = inject(EntryFlowStore);
  protected readonly field = FIELD;
}

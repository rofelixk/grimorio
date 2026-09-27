import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MISC, PROFILE } from '@utils/entry-copy';
import { TextField } from '@shared/ds/text-field/text-field';
import { ProfileFlowStore } from '../profile-flow.store';

// Both password changes (FR-010, FR-016a): `pw` — the profile's local password, current + new
// twice; `cloudpw` — the account's, under its e-mail plate. Labels say "do perfil" vs "da conta".
// The modal renders the form error and the Cancelar + verb row.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-password-step',
  imports: [TextField],
  template: `
    @if (store.phase() === 'pw') {
      <app-text-field
        [label]="field.pwCurrent"
        type="password"
        name="current-password"
        autocomplete="current-password"
        [value]="store.fields().pw"
        [error]="store.fieldErrors().pw"
        [readonly]="store.loading()"
        (valueChange)="store.editField('pw', $event)"
      />
      <app-text-field
        [label]="field.pwNew"
        type="password"
        name="new-password"
        autocomplete="new-password"
        [value]="store.fields().pwNew"
        [helper]="field.pwNewHelper"
        [error]="store.fieldErrors().pwNew"
        [readonly]="store.loading()"
        (valueChange)="store.editField('pwNew', $event)"
      />
      <app-text-field
        [label]="field.pwConfirm"
        type="password"
        name="confirm-password"
        autocomplete="new-password"
        [value]="store.fields().pwConfirm"
        [error]="store.fieldErrors().pwConfirm"
        [readonly]="store.loading()"
        (valueChange)="store.editField('pwConfirm', $event)"
      />
    } @else {
      <div class="plate">
        <span class="micro-label">{{ cloudAccount }}</span>
        <span>{{ store.linkedEmail() }}</span>
      </div>
      <app-text-field
        [label]="field.cloudPwCurrent"
        type="password"
        name="current-password"
        autocomplete="current-password"
        [value]="store.fields().pw"
        [error]="store.fieldErrors().pw"
        [readonly]="store.loading()"
        (valueChange)="store.editField('pw', $event)"
      />
      <app-text-field
        [label]="field.cloudPwNew"
        type="password"
        name="new-password"
        autocomplete="new-password"
        [value]="store.fields().pwNew"
        [helper]="field.cloudPwNewHelper"
        [error]="store.fieldErrors().pwNew"
        [readonly]="store.loading()"
        (valueChange)="store.editField('pwNew', $event)"
      />
    }
  `,
  styleUrl: '../profile-screen.scss',
})
export class PasswordStep {
  protected readonly store = inject(ProfileFlowStore);
  protected readonly field = PROFILE.field;
  protected readonly cloudAccount = MISC.cloudAccount;
}

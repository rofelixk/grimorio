import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PROFILE } from '@utils/entry-copy';
import { TextField } from '@shared/ds/text-field/text-field';
import { ProfileFlowStore } from '../profile-flow.store';

// "Excluir conta na nuvem" (FR-019): what leaves the cloud for good, that other devices stop
// syncing while this profile stays, and the account password. The modal renders the form error,
// Cancelar and the danger verb.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-delete-cloud-step',
  imports: [TextField],
  template: `
    <div class="plate">
      <span class="micro-label">{{ copy.plate }}</span>
      <span>{{ copy.items }}</span>
    </div>
    <p class="note">{{ note() }}</p>
    <app-text-field
      [label]="field.pwAccount"
      type="password"
      name="current-password"
      autocomplete="current-password"
      [value]="store.fields().pw"
      [error]="store.fieldErrors().pw"
      [readonly]="store.loading()"
      (valueChange)="store.editField('pw', $event)"
    />
  `,
  styleUrl: '../profile-screen.scss',
})
export class DeleteCloudStep {
  protected readonly store = inject(ProfileFlowStore);
  protected readonly copy = PROFILE.delcloud;
  protected readonly field = PROFILE.field;

  protected readonly note = computed(() => this.copy.note(this.store.active()?.name ?? ''));
}

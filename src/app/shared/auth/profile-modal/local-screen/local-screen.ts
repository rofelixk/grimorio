import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FIELD, HELPER, PROFILE } from '@utils/entry-copy';
import { ActionRow } from '@shared/ds/action-row/action-row';
import { TextField } from '@shared/ds/text-field/text-field';
import { ProfileFlowStore } from '../profile-flow.store';

// "Perfil neste aparelho" (FR-004, FR-009): the name field with Salvar, and the entries to the
// profile password and profile deletion. Colors change on the wheel, outside this screen.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-local-screen',
  imports: [TextField, ActionRow],
  template: `
    <app-text-field
      [label]="field.name"
      name="username"
      autocomplete="username"
      [value]="store.fields().name"
      [helper]="helper.name"
      [error]="store.fieldErrors().user"
      [readonly]="store.loading()"
      (valueChange)="store.editField('name', $event)"
    />
    <div class="list">
      <app-action-row
        [title]="copy.pwRow.title"
        [meta]="copy.pwRow.meta"
        [verb]="copy.pwRow.verb"
        (activate)="store.openStep('pw')"
      />
    </div>
    <div class="list">
      <app-action-row
        [danger]="true"
        [title]="copy.deleteRow.title"
        [meta]="deleteMeta()"
        [verb]="copy.deleteRow.verb"
        [disabled]="store.syncBusy()"
        [hint]="store.syncBusy() ? busyHint : ''"
        (activate)="store.openStep('delprofile')"
      />
    </div>
    <div class="actions">
      <button type="button" class="btn btn--ghost" (click)="store.back()">{{ back }}</button>
      <button type="submit" class="btn btn--primary" [disabled]="!store.salvarEnabled()">
        {{ store.primary() }}
      </button>
    </div>
  `,
  styleUrl: '../profile-screen.scss',
})
export class LocalScreen {
  protected readonly store = inject(ProfileFlowStore);
  protected readonly copy = PROFILE.local;
  protected readonly field = FIELD;
  protected readonly helper = HELPER;
  protected readonly back = PROFILE.back;
  protected readonly busyHint = PROFILE.syncBusyHint;

  protected readonly deleteMeta = computed(() => this.copy.deleteRow.meta(this.store.active()?.name ?? ''));
}

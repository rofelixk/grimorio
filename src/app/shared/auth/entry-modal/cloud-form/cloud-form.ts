import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ACTION, FIELD, MISC, PROMPT } from '@utils/entry-copy';
import { TextField } from '@shared/ds/text-field/text-field';
import { EntryFlowStore } from '../entry-flow.store';

// Cloud-account phases: `in`, `up`, `setup`, `reauth`, `recover-form`. `unlink` has no fields
// (subtitle + actions in the modal).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cloud-form',
  imports: [TextField],
  templateUrl: './cloud-form.html',
  styleUrl: './cloud-form.scss',
})
export class CloudForm {
  protected readonly store = inject(EntryFlowStore);
  protected readonly field = FIELD;
  protected readonly forgot = ACTION.forgot;
  protected readonly cloudAccount = MISC.cloudAccount;
  protected readonly inUse = PROMPT.emailInUse;
}

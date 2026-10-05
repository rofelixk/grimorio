import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ACTION, FIELD, MISC, PROMPT } from '@utils/entry-copy';
import { TextField } from '@shared/ds/text-field/text-field';
import { CloudSteps } from '@shared/auth/cloud-steps';

// Cloud-account phases: `in`, `up`, `setup`, `reauth`, `recover-form`, in either modal (through
// the modal's CloudSteps).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cloud-form',
  imports: [TextField],
  templateUrl: './cloud-form.html',
  styleUrl: './cloud-form.scss',
})
export class CloudForm {
  protected readonly store = inject(CloudSteps);
  protected readonly field = FIELD;
  /** "Redefinir senha do perfil" asks for the account's password, so its link names it (FR-024). */
  protected readonly forgotLabel = computed(() =>
    this.store.phase() === 'recover-form' ? ACTION.forgotAccount : ACTION.forgot,
  );
  protected readonly cloudAccount = MISC.cloudAccount;
  protected readonly inUse = PROMPT.emailInUse;
}

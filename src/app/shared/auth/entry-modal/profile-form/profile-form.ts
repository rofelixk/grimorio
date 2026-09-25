import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ACTION, FIELD, HELPER, MISC } from '@utils/entry-copy';
import { IdentityWheel } from '@shared/ds/identity-wheel/identity-wheel';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { TextField } from '@shared/ds/text-field/text-field';
import { EntryFlowStore } from '../entry-flow.store';

// Local-profile phases: `profile` (create), `unlock`, `localreset-newpw`, `recover-newpw`.
// `localreset-warn` has no fields (subtitle + actions in the modal).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile-form',
  imports: [TextField, IdentityWheel],
  templateUrl: './profile-form.html',
  styleUrl: './profile-form.scss',
})
export class ProfileForm {
  protected readonly store = inject(EntryFlowStore);
  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);
  protected readonly field = FIELD;
  protected readonly helper = HELPER;
  protected readonly forgot = ACTION.forgot;
  protected readonly yourIdentity = MISC.yourIdentity;
}

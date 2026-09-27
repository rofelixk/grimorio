import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ACTION } from '@utils/entry-copy';
import { PROFILE_TITLE_ID, ProfileFlowStore } from '../profile-flow.store';

// Every profile-modal done screen: title, one sentence, then Concluir, which returns to the
// screen the step was opened from (FR-004a).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile-done-panel',
  template: `
    @if (store.doneCopy(); as copy) {
      <h2 class="title" [id]="titleId">{{ copy.title }}</h2>
      <p class="body">{{ copy.body }}</p>
      <div class="actions">
        <button type="button" class="btn btn--primary btn--block" (click)="store.concluir()">{{ done }}</button>
      </div>
    }
  `,
  styleUrl: '../../entry-modal/done-panel/done-panel.scss',
})
export class ProfileDonePanel {
  protected readonly store = inject(ProfileFlowStore);
  protected readonly done = ACTION.done;
  protected readonly titleId = PROFILE_TITLE_ID;
}

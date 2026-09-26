import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ACTION } from '@utils/entry-copy';
import { ENTRY_TITLE_ID, EntryFlowStore } from '../entry-flow.store';

// Every success screen (STATES.md "Success screens"): title, body and the optional secondary
// action, then Concluir, which closes and resets (FR-037).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-done-panel',
  template: `
    @if (store.doneCopy(); as copy) {
      <h2 class="title" [id]="titleId">{{ copy.title }}</h2>
      <p class="body">{{ copy.body }}</p>
      <div class="actions">
        <button type="button" class="btn btn--primary" (click)="store.close()">{{ action.done }}</button>
        @if (store.done() === 'profiled') {
          <button type="button" class="btn btn--secondary" (click)="store.linkAfterCreate()">
            {{ action.linkCloud }}
          </button>
        }
      </div>
    }
  `,
  styleUrl: './done-panel.scss',
})
export class DonePanel {
  protected readonly store = inject(EntryFlowStore);
  protected readonly action = ACTION;
  protected readonly titleId = ENTRY_TITLE_ID;
}

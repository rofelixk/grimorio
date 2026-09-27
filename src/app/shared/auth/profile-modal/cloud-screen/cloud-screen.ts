import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ACTION, PROFILE } from '@utils/entry-copy';
import { ActionRow } from '@shared/ds/action-row/action-row';
import { ProfileFlowStore } from '../profile-flow.store';

// "Conta na nuvem" (FR-004, ui.md §2), per link state: linked → account password, unlink and
// (in its own list) account deletion; expired → "Entrar de novo" and unlink; local → the link
// block only.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cloud-screen',
  imports: [ActionRow],
  template: `
    @switch (store.linkState()) {
      @case ('linked') {
        <div class="plate">
          <span class="micro-label">{{ copy.plateLinked }}</span>
          <span>{{ store.linkedEmail() }}</span>
        </div>
        <div class="list">
          <app-action-row
            [title]="copy.pwRow.title"
            [meta]="copy.pwRow.meta"
            [verb]="copy.pwRow.verb"
            (activate)="store.openStep('cloudpw')"
          />
          <app-action-row
            [title]="copy.unlinkRow.title"
            [meta]="copy.unlinkRow.meta"
            [verb]="copy.unlinkRow.verb"
            (activate)="store.openStep('unlink')"
          />
        </div>
        <div class="list">
          <app-action-row
            [danger]="true"
            [title]="copy.deleteRow.title"
            [meta]="deleteMeta()"
            [verb]="copy.deleteRow.verb"
            (activate)="store.openStep('delcloud')"
          />
        </div>
      }
      @case ('expired') {
        <div class="plate plate--block">
          <span class="plate-head">
            <span class="micro-label danger-label">{{ copy.plateExpired }}</span>
            <span>{{ store.linkedEmail() }}</span>
            <span class="note">{{ copy.plateExpiredNote }}</span>
          </span>
          <button type="button" class="btn btn--primary btn--block" (click)="store.openStep('reauth')">
            {{ copy.reauth }}
          </button>
        </div>
        <div class="list">
          <app-action-row
            [title]="copy.unlinkRow.title"
            [meta]="copy.unlinkRow.meta"
            [verb]="copy.unlinkRow.verb"
            (activate)="store.openStep('unlink')"
          />
        </div>
      }
      @case ('local') {
        <div class="plate plate--block">
          <span class="plate-head">
            <span class="micro-label">{{ copy.plateLocal }}</span>
            <span class="note">{{ localNote() }}</span>
          </span>
          <button type="button" class="btn btn--secondary btn--block" (click)="store.openStep('in')">
            {{ link }}
          </button>
        </div>
      }
    }
    <div class="actions">
      <button type="button" class="btn btn--ghost" (click)="store.back()">{{ back }}</button>
    </div>
  `,
  styleUrl: '../profile-screen.scss',
})
export class CloudScreen {
  protected readonly store = inject(ProfileFlowStore);
  protected readonly copy = PROFILE.cloud;
  protected readonly back = PROFILE.back;
  protected readonly link = ACTION.linkCloud;

  protected readonly deleteMeta = computed(() => this.copy.deleteRow.meta(this.store.linkedEmail()));
  protected readonly localNote = computed(() => this.copy.plateLocalNote(this.store.active()?.name ?? ''));
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PROFILE } from '@utils/entry-copy';
import { SyncMark } from '@shared/ds/sync-mark/sync-mark';
import { TextField } from '@shared/ds/text-field/text-field';
import { ProfileFlowStore } from '../profile-flow.store';

// "Excluir perfil" (FR-017, FR-018a): what leaves the device, the cloud note for a linked profile,
// the unsynced-changes block with its in-place sync, and the profile password. The modal renders
// Cancelar and the danger verb, locked while a sync runs.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-delete-profile-step',
  imports: [TextField, SyncMark],
  template: `
    <div class="plate">
      <span class="micro-label">{{ copy.plate }}</span>
      <span>{{ items() }}</span>
    </div>
    @if (store.linkState() !== 'local') {
      <p class="note">{{ linkedNote() }}</p>
    }
    @if (store.unsynced()) {
      <div class="plate plate--danger plate--block" role="status">
        <span class="danger-label">{{ copy.unsynced }}</span>
        @switch (store.blockSync()) {
          @case ('idle') {
            <div>
              <button type="button" class="btn btn--secondary" [disabled]="store.syncBusy()" (click)="store.syncBeforeDelete()">
                {{ copy.syncNow }}
              </button>
            </div>
          }
          @case ('syncing') {
            <span class="sync-line"><app-sync-mark kind="syncing" />{{ copy.syncing }}</span>
          }
          @default {
            @if (store.blockFailure(); as failure) {
              <span class="sync-line danger-label"><app-sync-mark kind="error" />{{ failure }}</span>
              <div>
                <button type="button" class="btn btn--secondary" (click)="store.syncBeforeDelete()">{{ copy.retry }}</button>
              </div>
            }
          }
        }
      </div>
    }
    @if (store.blockSync() === 'done' && !store.unsynced()) {
      <span class="sync-line" role="status"><app-sync-mark kind="synced" />{{ copy.synced }}</span>
    }
    <app-text-field
      [label]="field.pwProfile"
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
export class DeleteProfileStep {
  protected readonly store = inject(ProfileFlowStore);
  protected readonly copy = PROFILE.delprofile;
  protected readonly field = PROFILE.field;

  protected readonly items = computed(() => this.copy.items(this.store.active()?.name ?? ''));
  protected readonly linkedNote = computed(() => this.copy.linkedNote(this.store.linkedEmail()));
}

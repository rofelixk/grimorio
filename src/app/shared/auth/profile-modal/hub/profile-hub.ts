import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PROFILE } from '@utils/entry-copy';
import { hubCloudMeta } from '@utils/profile-flow.util';
import { ActionRow } from '@shared/ds/action-row/action-row';
import { MiniWheel } from '@shared/ds/mini-wheel/mini-wheel';
import { SyncPlate } from '@shared/ds/sync-plate/sync-plate';
import { ProfileFlowStore } from '../profile-flow.store';

// The hub (ui.md §2): the sync plate and the entries to "Perfil neste aparelho" and "Conta na
// nuvem". The modal renders its title and the "Trocar de perfil" prompt.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile-hub',
  imports: [SyncPlate, ActionRow, MiniWheel],
  template: `
    <app-sync-plate (link)="store.openStep('in')" (reauth)="store.openStep('reauth')" />
    <div class="list" role="list">
      <app-action-row
        role="listitem"
        [title]="copy.localRow.title"
        [meta]="copy.localRow.meta"
        [verb]="copy.verb"
        (activate)="store.openLocal()"
      >
        <app-mini-wheel [colors]="store.active()?.colors ?? []" />
      </app-action-row>
      <app-action-row
        role="listitem"
        [title]="copy.cloudRow"
        [meta]="cloudMeta()"
        [verb]="copy.verb"
        (activate)="store.openCloud()"
      >
        <span class="spacer"></span>
      </app-action-row>
    </div>
  `,
  styleUrl: '../profile-screen.scss',
})
export class ProfileHub {
  protected readonly store = inject(ProfileFlowStore);
  protected readonly copy = PROFILE.hub;

  protected readonly cloudMeta = computed(() => {
    const active = this.store.active();
    return active ? hubCloudMeta(active) : '';
  });
}

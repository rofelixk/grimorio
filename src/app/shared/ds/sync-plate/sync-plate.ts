import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { ProfileSessionService } from '@services/profile-session.service';
import { SyncStatusService } from '@services/sync-status.service';
import { PROFILE, SYNC_AREA } from '@utils/entry-copy';
import { linkState } from '@utils/profile-flow.util';
import { SyncDisplayKind } from '@utils/sync-status.util';
import { SyncMark } from '@shared/ds/sync-mark/sync-mark';

type PlateButton = { label: string; kind: 'sync' | 'link' | 'reauth'; primary: boolean } | null;

// The profile modal hub's expanded sync area (DESIGN.md "Sync plate"): mark + label over the
// e-mail (or the local line), and one button. Sync / retry run here; linking and re-sign-in are
// the owner's to open (`link` / `reauth`). An expired session shows in danger with a primary
// "Entrar de novo".
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sync-plate',
  imports: [SyncMark],
  template: `
    @if (view(); as v) {
      <div class="plate" [class.plate--danger]="v.expired" role="status">
        <span class="status">
          <span class="line" [class.failure]="v.failure">
            <app-sync-mark [kind]="v.kind" />
            <span>{{ v.label }}</span>
          </span>
          <span class="meta">{{ v.meta }}</span>
        </span>
        @if (v.button; as b) {
          <button type="button" class="btn" [class.btn--primary]="b.primary" [class.btn--secondary]="!b.primary" (click)="press(b.kind)">
            {{ b.label }}
          </button>
        }
      </div>
    }
  `,
  styleUrl: './sync-plate.scss',
})
export class SyncPlate {
  /** "Vincular conta na nuvem": the owner opens the sign-in step. */
  readonly link = output<void>();
  /** "Entrar de novo": the owner opens the re-sign-in step. */
  readonly reauth = output<void>();

  private readonly status = inject(SyncStatusService);
  private readonly session = inject(ProfileSessionService);

  protected readonly view = computed(() => {
    const active = this.session.active();
    const display = this.status.display();
    if (!active || !display) {
      return null;
    }
    const state = linkState(active);
    const email = active.cloud?.email ?? '';
    if (state === 'expired' || display.kind === 'expired') {
      return {
        kind: 'expired' as SyncDisplayKind,
        label: SYNC_AREA.expired,
        meta: email,
        failure: true,
        expired: true,
        button: { label: SYNC_AREA.actReauth, kind: 'reauth', primary: true } as PlateButton,
      };
    }
    let button: PlateButton = null;
    switch (display.action) {
      case 'sync':
      case 'retry':
        button = { label: display.actionLabel!, kind: 'sync', primary: false };
        break;
      case 'link':
        button = { label: SYNC_AREA.actLink, kind: 'link', primary: false };
        break;
    }
    return {
      kind: display.kind,
      label: display.label,
      meta: state === 'local' ? PROFILE.syncPlate.localMeta : email,
      failure: display.failure,
      expired: false,
      button,
    };
  });

  protected press(kind: 'sync' | 'link' | 'reauth'): void {
    switch (kind) {
      case 'sync':
        this.status.act();
        return;
      case 'link':
        this.link.emit();
        return;
      case 'reauth':
        this.reauth.emit();
        return;
    }
  }
}

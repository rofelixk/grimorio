import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { SyncStatusService } from '@services/sync-status.service';
import { SYNC_AREA } from '@utils/entry-copy';
import { SyncDisplay } from '@utils/sync-status.util';
import { SyncMark } from '@shared/ds/sync-mark/sync-mark';

// The active profile's sync status in its three shell forms (DESIGN.md "Sync area & sync
// mark"): the wide bar's button (`area`), the narrow bar's non-interactive mark (`mark`,
// FR-018a) and the drawer's status line + action (`drawer`). Renders nothing with no profile.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sync-status',
  imports: [SyncMark],
  templateUrl: './sync-status.html',
  styleUrl: './sync-status.scss',
  host: { '[class]': "'is-' + variant()" },
})
export class SyncStatus {
  readonly variant = input.required<'area' | 'mark' | 'drawer'>();
  /** The drawer's action link; the drawer decides whether to close first (FR-020a). */
  readonly action = output<SyncDisplay>();

  private readonly status = inject(SyncStatusService);
  protected readonly display = this.status.display;
  protected readonly busy = this.status.busy;

  protected readonly areaLabel = computed(() => {
    const display = this.display();
    if (!display) {
      return null;
    }
    return display.actionLabel ? SYNC_AREA.areaLabel(display.label, display.actionLabel) : display.label;
  });

  protected onArea(): void {
    if (!this.busy()) {
      this.status.act();
    }
  }
}

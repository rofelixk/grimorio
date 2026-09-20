import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SyncService } from '@services/sync.service';
import { ThemeService } from '@services/theme.service';

const TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-sync-indicator',
  styleUrl: './sync-indicator.scss',
  templateUrl: './sync-indicator.html',
  host: {
    '[style.--sync-primary]': 'themeService.roles().primary',
    '[style.--sync-accent]': 'themeService.roles().accent',
  },
})
export class SyncIndicator {
  protected readonly themeService = inject(ThemeService);
  private readonly syncService = inject(SyncService);

  readonly status = this.syncService.status;
  readonly staleLabel = this.syncService.staleLabel;

  readonly freshLabel = computed(() => {
    const last = this.syncService.lastSyncedAt();
    return last ? `Sincronizado ${TIME_FORMAT.format(new Date(last))}` : '';
  });

  sync(): void {
    this.syncService.sync().catch(() => undefined);
  }
}

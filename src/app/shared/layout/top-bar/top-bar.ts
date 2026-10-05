import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileModalService } from '@services/profile-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { ShellState } from '@services/shell-state.service';
import { MISC, SHELL } from '@utils/entry-copy';
import { ProfileControl } from '@shared/layout/profile-control/profile-control';
import { SyncStatus } from '@shared/layout/sync-status/sync-status';

// The app top bar (DESIGN.md "App top bar"). Wide: wordmark · sync area · divider · profile
// control. Narrow: wordmark · sync mark · Menu, with the profile in the drawer (FR-018).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-top-bar',
  imports: [RouterLink, ProfileControl, SyncStatus],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  host: { role: 'banner', '[class.is-wide]': 'shell.wide()' },
})
export class TopBar {
  protected readonly shell = inject(ShellState);
  private readonly session = inject(ProfileSessionService);
  private readonly entryModal = inject(EntryModalService);
  private readonly profileModal = inject(ProfileModalService);

  protected readonly active = this.session.active;
  protected readonly copy = SHELL;
  protected readonly wordmark = MISC.wordmark;

  /** The profile modal's hub, or the entry modal with no active profile (FR-001). */
  protected openProfile(): void {
    if (this.active()) {
      this.profileModal.open();
    } else {
      void this.entryModal.open();
    }
  }
}

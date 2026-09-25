import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { SyncService } from '@services/sync.service';
import { MSG, SYNC, TOP_BAR } from '@utils/entry-copy';

// TEMPORARY placeholder (FR-029): states which profile is active and whether it is linked, and
// opens the entry flows. Deliberately unstyled beyond 44px targets; its final design is out of
// scope for spec 003.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile-button',
  templateUrl: './profile-button.html',
  styleUrl: './profile-button.scss',
})
export class ProfileButton {
  private readonly session = inject(ProfileSessionService);
  private readonly entryModal = inject(EntryModalService);
  private readonly sync = inject(SyncService);

  protected readonly copy = TOP_BAR;
  protected readonly active = this.session.active;
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');

  protected readonly label = computed(() => {
    const profile = this.active();
    return profile ? TOP_BAR.profileLabel(profile.name, !!profile.cloud) : TOP_BAR.noProfile;
  });

  protected readonly syncStatus = computed(() => {
    switch (this.sync.state()) {
      case 'syncing':
        return SYNC.syncing;
      case 'done':
        return SYNC.synced;
      case 'offline':
        return MSG.offline;
      case 'error':
        return MSG.generic;
      default:
        return '';
    }
  });

  protected openEntry(): void {
    void this.entryModal.open();
  }

  protected switchProfile(): void {
    this.hideMenu();
    void this.entryModal.open({ context: 'gate', start: 'list' });
  }

  protected cloudAccount(): void {
    this.hideMenu();
    const cloud = this.active()?.cloud;
    const start = !cloud ? 'in' : cloud.needsReauth ? 'reauth' : 'unlink';
    void this.entryModal.open({ context: 'link', start });
  }

  protected syncNow(): void {
    if (this.active()?.cloud?.needsReauth) {
      this.hideMenu();
      void this.entryModal.open({ context: 'link', start: 'reauth' });
      return;
    }
    void this.sync.syncNow();
  }

  private hideMenu(): void {
    this.menu()?.nativeElement.hidePopover();
  }
}

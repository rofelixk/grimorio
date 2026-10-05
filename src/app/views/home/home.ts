import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileStore } from '@services/profile-store.service';
import { PROFILE } from '@utils/entry-copy';

// Home (ungated). With no profile on the device it shows the empty-device state (FR-018b).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  protected readonly profiles = inject(ProfileStore).profiles;
  private readonly entryModal = inject(EntryModalService);
  protected readonly copy = PROFILE.emptyDevice;

  protected createProfile(): void {
    void this.entryModal.open({ context: 'device', start: 'profile' });
  }
}

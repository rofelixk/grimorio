import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ProfileSessionService } from '@services/profile-session.service';
import { SyncStatusService } from '@services/sync-status.service';
import { SHELL } from '@utils/entry-copy';
import { colorNames, tribeName } from '@utils/identity.util';

// Who is active (DESIGN.md "Profile control"): identity dots + name, or "Entrar" with no
// profile. The owner opens the entry modal on `activate`; locked while a sync runs (FR-005a).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile-control',
  templateUrl: './profile-control.html',
  styleUrl: './profile-control.scss',
  host: { '[class.is-drawer]': "variant() === 'drawer'" },
})
export class ProfileControl {
  readonly variant = input.required<'bar' | 'drawer'>();
  readonly activate = output<void>();

  private readonly session = inject(ProfileSessionService);
  private readonly status = inject(SyncStatusService);

  protected readonly copy = SHELL;
  protected readonly active = this.session.active;
  protected readonly busy = this.status.busy;

  protected readonly dots = computed(() =>
    (this.active()?.colors ?? []).map((color) => `var(--identity-${color.toLowerCase()})`),
  );

  protected readonly label = computed(() => {
    const profile = this.active();
    if (!profile) {
      return SHELL.signIn;
    }
    if (this.busy()) {
      return SHELL.profileBusy;
    }
    return SHELL.profileLabel(profile.name, tribeName(profile.colors), colorNames(profile.colors));
  });

  protected onClick(): void {
    if (this.active() && this.busy()) {
      return;
    }
    this.activate.emit();
  }
}

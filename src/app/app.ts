import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IdentityService } from '@services/identity.service';
import { SyncScheduler } from '@services/sync-scheduler.service';
import { NavBar } from '@shared';
import { EntryModal } from '@shared/auth/entry-modal/entry-modal';
import { TopBar } from '@shared/layout/top-bar/top-bar';

// The app root is the themed root (R13): it carries the active profile's roles — or the
// default R → U → G identity — so every new-system surface below it is tinted (FR-035).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavBar, TopBar, EntryModal],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  host: {
    'data-grm': '',
    'data-theme-scope': '',
    '[style.--theme-primary]': 'identity.roles().primary',
    '[style.--theme-primary-hover]': 'identity.roles().primaryHover',
    '[style.--theme-accent]': 'identity.roles().accent',
    '[style.--theme-accent-hover]': 'identity.roles().accentHover',
    '[style.--theme-tertiary]': 'identity.roles().tertiary',
    '[style.--theme-tertiary-hover]': 'identity.roles().tertiaryHover',
  },
})
export class App {
  protected readonly identity = inject(IdentityService);

  constructor() {
    inject(SyncScheduler).start();
  }
}

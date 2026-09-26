import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { IdentityService } from '@services/identity.service';
import { ShellState } from '@services/shell-state.service';
import { SyncService } from '@services/sync.service';
import { EntryModal } from '@shared/auth/entry-modal/entry-modal';
import { LegalNotice } from '@shared/layout/legal-notice/legal-notice';
import { NavDrawer } from '@shared/layout/nav-drawer/nav-drawer';
import { SideNav } from '@shared/layout/side-nav/side-nav';
import { TopBar } from '@shared/layout/top-bar/top-bar';

const pathOf = (url: string) => url.split(/[?#]/, 1)[0];

// The app root is the themed root (R13): it carries the active profile's roles — or the
// default R → U → G identity — so every new-system surface below it is tinted (FR-035). It is
// also the app shell (spec 004): top bar, side nav (wide) or drawer (narrow), and <main>.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, TopBar, SideNav, NavDrawer, LegalNotice, EntryModal],
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
  protected readonly shell = inject(ShellState);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    inject(SyncService).start();

    // <main> is the scroll container, so the router's window scrolling never applies (R3). A
    // new page starts at the top; a session re-guard of the same page keeps its position.
    const router = inject(Router);
    let previousPath: string | null = null;
    const subscription = router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) {
        return;
      }
      const path = pathOf(event.urlAfterRedirects);
      const info = (router.currentNavigation() ?? router.lastSuccessfulNavigation())?.extras.info as
        | { sessionChange?: boolean }
        | undefined;
      if (path !== previousPath && !info?.sessionChange) {
        this.main().nativeElement.scrollTop = 0;
      }
      previousPath = path;
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }
}

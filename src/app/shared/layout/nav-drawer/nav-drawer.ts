import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileModalService } from '@services/profile-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { ShellState } from '@services/shell-state.service';
import { SyncStatusService } from '@services/sync-status.service';
import { SHELL } from '@utils/entry-copy';
import { SyncDisplay } from '@utils/sync-status.util';
import { ToastOutlet } from '@shared/ds/toast/toast-outlet';
import { NavLinks } from '@shared/layout/nav-links/nav-links';
import { ProfileControl } from '@shared/layout/profile-control/profile-control';
import { SyncStatus } from '@shared/layout/sync-status/sync-status';

// The narrow drawer (DESIGN.md "Drawer", research R5/R6): a native modal <dialog> on the right
// edge with the account block and the mirrored nav, driven by ShellState.drawerOpen. Every close
// returns focus to Menu; controls that open a modal close the drawer first (FR-020a), so the
// modal records Menu as its opener.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-nav-drawer',
  imports: [NavLinks, ProfileControl, SyncStatus, ToastOutlet],
  templateUrl: './nav-drawer.html',
  styleUrl: './nav-drawer.scss',
})
export class NavDrawer {
  private readonly shell = inject(ShellState);
  private readonly session = inject(ProfileSessionService);
  private readonly entryModal = inject(EntryModalService);
  private readonly profileModal = inject(ProfileModalService);
  private readonly status = inject(SyncStatusService);

  protected readonly copy = SHELL;
  protected readonly drawerOpen = this.shell.drawerOpen;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  constructor() {
    // A backdrop tap is a pointer-only shortcut; keyboard users close with Esc or ✕, so this
    // listener is attached here rather than in the template (as in ThemedModal).
    afterNextRender(() => {
      this.dialog().nativeElement.addEventListener('click', (event) => this.onClick(event));
    });

    effect(() => {
      const open = this.shell.drawerOpen();
      const dialog = this.dialog().nativeElement;
      untracked(() => {
        if (open && !dialog.open) {
          dialog.showModal();
          const target = this.shell.openedViaKeyboard() ? this.closeButton().nativeElement : dialog;
          target.focus({ preventScroll: true });
        } else if (!open && dialog.open) {
          // Navigation closed it (ShellState): same close path, focus back on Menu.
          this.close();
        }
      });
    });
  }

  /** ✕, Esc/Back, a backdrop tap, navigation. Synchronous, so a modal can open right after. */
  protected close(): void {
    this.shell.closeDrawer();
    const dialog = this.dialog().nativeElement;
    if (dialog.open) {
      dialog.close();
    }
    document.querySelector<HTMLElement>('[aria-controls="grm-drawer"]')?.focus({ preventScroll: true });
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  private onClick(event: MouseEvent): void {
    // Only a click on the dialog box itself (the backdrop area), not on anything inside it.
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }

  /** The profile modal's hub, or the entry modal with no active profile (FR-001). */
  protected onProfile(): void {
    this.close();
    if (this.session.active()) {
      this.profileModal.open();
    } else {
      void this.entryModal.open();
    }
  }

  protected onSyncAction(display: SyncDisplay): void {
    // Sincronizar agora / Tentar de novo keep the drawer open to show the progress; Vincular and
    // Entrar de novo open the profile modal at that step (FR-007), so the drawer closes first.
    if (display.opensModal) {
      this.close();
    }
    this.status.act();
  }
}

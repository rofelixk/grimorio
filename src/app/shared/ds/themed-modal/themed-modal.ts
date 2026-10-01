import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Roles } from '@utils/identity.util';
import { captureFocus } from '@shared/ds/focus';
import { ToastOutlet } from '@shared/ds/toast/toast-outlet';

// The themed modal shell (DESIGN.md "Themed modal"): a native <dialog> with the conic ring,
// halo and opaque face, themed by the identity in view. It is its own themed root
// (data-theme-scope), so the --role-* chain resolves against `roles`. Content decides the
// face layout: `[modalAside]` fills the desktop identity column, the rest the form column. It
// hosts the toast outlet, so a toast shows above it (R13). Mounting it opens the dialog and
// destroying it closes it: owners render it only while open, so nothing idles in the DOM.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-themed-modal',
  imports: [ToastOutlet],
  templateUrl: './themed-modal.html',
  styleUrl: './themed-modal.scss',
})
export class ThemedModal {
  readonly roles = input.required<Roles>();
  readonly labelledBy = input<string | null>(null);
  /** ✕, Esc or a backdrop click — the owner closes and resets. */
  readonly closed = output<void>();

  /** The face, sized by the owner's `FluidFace` (fluid height). */
  readonly face = viewChild.required<ElementRef<HTMLElement>>('face');
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      this.restoreFocus = captureFocus();
      dialog.showModal();
      // A click on the backdrop is a pointer-only shortcut; keyboard users close with Esc (the
      // dialog's cancel event) or ✕, so this listener is attached here rather than in the template.
      dialog.addEventListener('click', (event) => this.onClick(event));
    });

    inject(DestroyRef).onDestroy(() => {
      this.dialog().nativeElement.close();
      this.restoreFocus?.();
    });
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  private onClick(event: MouseEvent): void {
    // Only a click on the dialog box itself (the backdrop area), not on anything inside it.
    if (event.target === this.dialog().nativeElement) {
      this.closed.emit();
    }
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Roles } from '@utils/identity.util';

// The themed modal shell (DESIGN.md "Themed modal"): a native <dialog> with the conic ring,
// halo and opaque face, themed by the identity in view. It is its own themed root
// (data-theme-scope), so the --role-* chain resolves against `roles`. Content decides the
// face layout: `[modalAside]` fills the desktop identity column, the rest the form column.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-themed-modal',
  templateUrl: './themed-modal.html',
  styleUrl: './themed-modal.scss',
})
export class ThemedModal {
  readonly open = input(false);
  readonly roles = input.required<Roles>();
  /** Desktop face height in px (fluid height); null leaves it to the content. */
  readonly faceHeight = input<number | null>(null);
  readonly labelledBy = input<string | null>(null);
  /** ✕, Esc or a backdrop click — the owner closes and resets. */
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;

  constructor() {
    // A click on the backdrop is a pointer-only shortcut; keyboard users close with Esc (the
    // dialog's cancel event) or ✕, so this listener is attached here rather than in the template.
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      dialog.addEventListener('click', (event) => this.onClick(event));
    });

    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
        this.opener?.focus();
        this.opener = null;
      }
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

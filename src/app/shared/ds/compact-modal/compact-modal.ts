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
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { ACTION, MISC } from '@utils/entry-copy';
import { Roles } from '@utils/identity.util';

// The compact modal shell (DESIGN.md "Collections" → "Compact modal", research R10): a narrow
// themed-modal ring (480px, halo, no sparks) around a single-column face, full-bleed with a
// wordmark header on phone. Like ThemedModal it opens on mount and closes on destroy, restoring
// focus to the opener, so owners render it only while open. On open it focuses the content's
// `[data-autofocus]` element, if any. `locked` ignores Esc, the backdrop
// and ✕ while an operation runs (FR-031).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-compact-modal',
  templateUrl: './compact-modal.html',
  styleUrl: './compact-modal.scss',
})
export class CompactModal {
  readonly roles = input.required<Roles>();
  readonly labelledBy = input<string | null>(null);
  readonly locked = input(false);
  /** ✕, Esc or a backdrop click, unless locked. */
  readonly closed = output<void>();

  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);
  protected readonly wordmark = MISC.wordmark;
  protected readonly closeLabel = ACTION.close;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      // Content marks its first stop (the name field, or Cancelar in a confirmation).
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
      // Pointer-only shortcut; keyboard users close with Esc (cancel) or ✕.
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) this.requestClose();
      });
    });

    inject(DestroyRef).onDestroy(() => {
      this.dialog().nativeElement.close();
      this.opener?.focus();
    });
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.requestClose();
  }

  protected requestClose(): void {
    if (!this.locked()) {
      this.closed.emit();
    }
  }
}

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
import { FluidHeight } from '@shared/ds/fluid-height';
import { MARKED_STOP, captureFocus, focusFirst } from '@shared/ds/focus';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { ToastOutlet } from '@shared/ds/toast/toast-outlet';
import { ACTION, MISC } from '@utils/entry-copy';
import { Roles } from '@utils/identity.util';

// The compact modal shell (DESIGN.md "Collections" → "Compact modal", research R10): a narrow
// themed-modal ring (480px, halo, no sparks) around a single-column face, full-bleed with a
// wordmark header on phone. Like ThemedModal it opens on mount and closes on destroy, restoring
// focus to the opener, so owners render it only while open. On open it focuses the content's
// `[data-autofocus]` element, if any. `locked` ignores Esc, the backdrop
// and ✕ while an operation runs (FR-031). On desktop the face follows its content's height
// (`FluidHeight`), animated from the first pointer or key press on (DESIGN.md "Compact modal").
// `size` picks the ring: `compact` 480px, `wide` 720px with a fixed 640px face (no fluid height; only
// the content's own scroll area scrolls), `split` 880px, fluid, for two-pane content that places its
// own ✕ row. It hosts a toast outlet, so a toast shows inside this top `<dialog>`.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-compact-modal',
  imports: [ToastOutlet],
  templateUrl: './compact-modal.html',
  styleUrl: './compact-modal.scss',
})
export class CompactModal {
  readonly roles = input.required<Roles>();
  readonly size = input<'compact' | 'wide' | 'split'>('compact');
  readonly labelledBy = input<string | null>(null);
  readonly locked = input(false);
  /** ✕, Esc or a backdrop click, unless locked. */
  readonly closed = output<void>();

  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);
  protected readonly wordmark = MISC.wordmark;
  protected readonly closeLabel = ACTION.close;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly face = viewChild<ElementRef<HTMLElement>>('face');
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');
  private restoreFocus: (() => void) | null = null;
  // No minimum and no cap: the face's CSS max-height stops it and the whole face scrolls.
  protected readonly fluid = new FluidHeight({
    face: () => this.face()?.nativeElement,
    observe: () => [this.content()?.nativeElement],
    measure: () => (this.size() === 'wide' ? null : (this.content()?.nativeElement.offsetHeight ?? null)),
  });

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      this.restoreFocus = captureFocus();
      dialog.showModal();
      // Content marks its first stop (the name field, or Cancelar in a confirmation).
      focusFirst(dialog, MARKED_STOP);
      // Pointer-only shortcut; keyboard users close with Esc (cancel) or ✕.
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) this.requestClose();
      });
    });

    inject(DestroyRef).onDestroy(() => {
      this.dialog().nativeElement.close();
      this.restoreFocus?.();
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

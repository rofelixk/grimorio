import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MOBILE_QUERY, REDUCED_MOTION_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { ACTION, MISC } from '@utils/entry-copy';
import { Roles } from '@utils/identity.util';

/** A bit over the height transition (`--duration-base`, 0.24s). */
const RESIZE_FALLBACK_MS = 300;

// The compact modal shell (DESIGN.md "Collections" → "Compact modal", research R10): a narrow
// themed-modal ring (480px, halo, no sparks) around a single-column face, full-bleed with a
// wordmark header on phone. Like ThemedModal it opens on mount and closes on destroy, restoring
// focus to the opener, so owners render it only while open. On open it focuses the content's
// `[data-autofocus]` element, if any. `locked` ignores Esc, the backdrop
// and ✕ while an operation runs (FR-031). On desktop the face follows its content's height,
// animating each change like the themed modal (DESIGN.md Motion "Durations": 0.24s modal height).
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

  /**
   * Set at the first pointer or key press inside the dialog: height changes come from what the
   * person does there, and the content settling while the dialog opens never animates.
   */
  protected readonly sized = signal(false);
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly reducedMotion = mediaQuerySignal(REDUCED_MOTION_QUERY);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly face = viewChild.required<ElementRef<HTMLElement>>('face');
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');
  private opener: HTMLElement | null = null;

  constructor() {
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.measure()) : null;
    afterNextRender(() => {
      observer?.observe(this.content().nativeElement);
      this.measure();

      const dialog = this.dialog().nativeElement;
      const arm = () => this.sized.set(true);
      dialog.addEventListener('pointerdown', arm, { once: true });
      dialog.addEventListener('keydown', arm, { once: true });
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
      observer?.disconnect();
      clearTimeout(this.resizeTimer);
      this.dialog().nativeElement.close();
      this.opener?.focus();
    });
  }

  // Written straight to the face, not through bindings: the ResizeObserver runs after layout and
  // before paint, so the new height and the hidden scrollbar land in the same frame as the content
  // change. A binding would apply a frame later and flash the scrollbar.
  private measure(): void {
    const face = this.face().nativeElement;
    if (this.mobile()) {
      face.style.height = '';
      return;
    }
    const next = `${Math.ceil(this.content().nativeElement.offsetHeight)}px`;
    if (next === face.style.height) return;
    if (this.sized() && !this.reducedMotion()) {
      // Cleared when the height transition ends, or by the timer if it never runs (clamped by
      // max-height, interrupted).
      face.classList.add('is-resizing');
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => face.classList.remove('is-resizing'), RESIZE_FALLBACK_MS);
    }
    face.style.height = next;
  }

  protected onTransitionEnd(event: TransitionEvent): void {
    if (event.target === event.currentTarget && event.propertyName === 'height') {
      clearTimeout(this.resizeTimer);
      this.face().nativeElement.classList.remove('is-resizing');
    }
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

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
import { NgTemplateOutlet } from '@angular/common';
import type { PlanarCard } from '@data/planechase/planar-card.model';
import { DECK } from '@utils/planechase-copy';
import { PlanarPreviewContent } from '@shared/gameplay/planar-preview/planar-preview';

// The card preview dialog (DESIGN.md "Card preview"): a native <dialog> reading surface with
// Anterior/Próxima and the card's on/off toggle. `wide` is centered with the themed modal's ring
// (no halo, no sparks); `narrow` is full-bleed with a pinned footer. Mounting it opens it with
// focus on ✕, destroying it closes it; unlike ThemedModal it doesn't restore focus, since the
// owner focuses the tile of the card on screen (research R5).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planar-preview-dialog',
  imports: [NgTemplateOutlet, PlanarPreviewContent],
  templateUrl: './planar-preview-dialog.html',
  styleUrl: './planar-preview-dialog.scss',
})
export class PlanarPreviewDialog {
  readonly card = input.required<PlanarCard>();
  readonly on = input.required<boolean>();
  readonly variant = input.required<'narrow' | 'wide'>();
  readonly setName = input.required<string>();
  /** 1-based, among the visible tiles. */
  readonly index = input.required<number>();
  readonly total = input.required<number>();
  readonly hasPrevious = input.required<boolean>();
  readonly hasNext = input.required<boolean>();
  readonly toggled = output<void>();
  readonly previous = output<void>();
  readonly next = output<void>();
  /** ✕, Esc or a backdrop click. */
  readonly closed = output<void>();

  protected readonly copy = DECK;
  protected readonly headingId = 'planar-preview-heading';

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      dialog.showModal();
      this.closeButton().nativeElement.focus();
      // Only a click on the dialog box itself (the backdrop area), not on anything inside it.
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) {
          this.closed.emit();
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.dialog().nativeElement.close());
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }
}

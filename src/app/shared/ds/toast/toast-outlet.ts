import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ToastService } from '@services/toast.service';
import { TOAST } from '@utils/entry-copy';

// One place a toast can render (DESIGN.md "Toast", research R13). Each host — the page, an open
// ThemedModal, the open drawer — has an outlet that registers while `active`; only the top one
// shows, as a manual popover, so the toast sits in the top layer above whichever dialog is open
// and its ✕ stays usable. It never takes focus.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-toast-outlet',
  templateUrl: './toast-outlet.html',
  styleUrl: './toast-outlet.scss',
})
export class ToastOutlet {
  /** While true this outlet is a registered host (the page's always is; a dialog's while open). */
  readonly active = input(true);

  private readonly toasts = inject(ToastService);
  protected readonly closeLabel = TOAST.close;

  private readonly hostId = signal<number | null>(null);
  private readonly popover = viewChild.required<ElementRef<HTMLElement>>('popover');

  /** The toast this outlet shows, if it is the top host. */
  protected readonly toast = computed(() => {
    const id = this.hostId();
    return id !== null && this.toasts.topHost() === id ? this.toasts.toast() : null;
  });

  constructor() {
    effect(() => {
      const active = this.active();
      untracked(() => {
        const id = this.hostId();
        if (active && id === null) {
          this.hostId.set(this.toasts.pushHost());
        } else if (!active && id !== null) {
          this.toasts.popHost(id);
          this.hostId.set(null);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      const id = this.hostId();
      if (id !== null) {
        this.toasts.popHost(id);
      }
    });

    // After render, so a dialog opened in the same pass is already in the top layer and the
    // popover lands above it.
    afterRenderEffect(() => {
      const el = this.popover().nativeElement;
      const show = !!this.toast();
      if (typeof el.showPopover !== 'function') {
        return;
      }
      const open = el.matches(':popover-open');
      if (show && !open) {
        el.showPopover();
      } else if (!show && open) {
        el.hidePopover();
      }
    });
  }

  protected dismiss(): void {
    this.toasts.dismiss();
  }
}

import { Injectable, computed, signal } from '@angular/core';

export const TOAST_MS = 5_000;

export interface Toast {
  id: number;
  label: string;
  text: string;
}

// The app-wide toast (FR-022, research R13): at most one, replaced by the next, gone after 5 s
// or on ✕. Outlets register as hosts; only the top one renders, so the toast always shows inside
// whichever dialog is on top (a modal <dialog> makes everything outside it inert).
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastSignal = signal<Toast | null>(null);
  readonly toast = this.toastSignal.asReadonly();

  private readonly hosts = signal<number[]>([]);
  /** The outlet that renders the toast: the most recently pushed, or 0 with none. */
  readonly topHost = computed(() => this.hosts().at(-1) ?? 0);

  private nextToastId = 0;
  private nextHostId = 1;
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(label: string, text: string): void {
    this.clearTimer();
    this.toastSignal.set({ id: this.nextToastId++, label, text });
    this.timer = setTimeout(() => this.dismiss(), TOAST_MS);
  }

  dismiss(): void {
    this.clearTimer();
    this.toastSignal.set(null);
  }

  pushHost(): number {
    const id = this.nextHostId++;
    this.hosts.update((list) => [...list, id]);
    return id;
  }

  popHost(id: number): void {
    this.hosts.update((list) => list.filter((host) => host !== id));
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

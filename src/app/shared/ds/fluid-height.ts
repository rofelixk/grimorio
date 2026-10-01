import { DestroyRef, Signal, afterRenderEffect, effect, inject, signal, untracked } from '@angular/core';
import { MOBILE_QUERY, REDUCED_MOTION_QUERY, mediaQuerySignal } from '@shared/ds/media-query';

/** A bit over the height transition (`--duration-base`, 0.24s). */
const RESIZE_FALLBACK_MS = 300;

export interface FluidHeightConfig {
  /** Where the height is written; undefined until rendered. */
  face: () => HTMLElement | undefined;
  /** Gets `is-resizing` (and `capped`, with `cap`). Defaults to the face. */
  scroller?: () => HTMLElement | undefined;
  /** The elements whose size changes trigger a measure (absent ones are skipped). */
  observe: () => readonly (HTMLElement | undefined)[];
  /** The face height the content needs, in px; null = nothing to measure yet. */
  measure: () => number | null;
  /** Minimum face height in px (default 0). */
  min?: number;
  /** Viewport margin in px; when set, `capped` is reported and written. */
  cap?: number;
}

// Desktop fluid height for a modal face (DESIGN.md "Fluid height", "Compact modal"): the face
// follows what `measure()` reports, animated only after the first pointer or key press inside the
// dialog (`is-sized`, which the face's CSS gates its transition on), instant under reduced motion
// and while opening. No height on phone. Create it in a component constructor.
//
// Everything is written straight to the DOM, not through bindings: the ResizeObserver runs after
// layout and before paint, so the new height, the hidden scrollbar (`is-resizing`) and `capped`
// land in the same frame as the content change. A binding would apply a frame later and flash the
// scrollbar. The observer's first notification is the measure on open.
export class FluidHeight {
  private readonly cappedState = signal(false);
  /** The content can't fit even at the tallest face (always false without `cap`, and on phone). */
  readonly capped: Signal<boolean> = this.cappedState.asReadonly();

  private readonly mobile = mediaQuerySignal(MOBILE_QUERY);
  private readonly reducedMotion = mediaQuerySignal(REDUCED_MOTION_QUERY);
  private readonly observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.measure()) : null;
  private observed: readonly HTMLElement[] = [];
  private armed = false;
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly config: FluidHeightConfig) {
    const cleanups: (() => void)[] = [];
    let listening = false;

    afterRenderEffect(() => {
      const elements = config.observe().filter((element): element is HTMLElement => !!element);
      if (elements.length !== this.observed.length || elements.some((element, i) => element !== this.observed[i])) {
        this.observer?.disconnect();
        elements.forEach((element) => this.observer?.observe(element));
        this.observed = elements;
      }

      const face = config.face();
      if (face && !listening) {
        listening = true;
        cleanups.push(...this.listen(face));
      }
    });

    // Crossing 640px while open drops or regains the height at once.
    let wasMobile: boolean | undefined;
    effect(() => {
      const mobile = this.mobile();
      if (wasMobile !== undefined && mobile !== wasMobile) {
        untracked(() => this.measure());
      }
      wasMobile = mobile;
    });

    // A window resize changes the cap without changing the content box.
    const onResize = () => this.measure();
    window.addEventListener('resize', onResize);
    cleanups.push(() => window.removeEventListener('resize', onResize));

    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      clearTimeout(this.resizeTimer);
      cleanups.forEach((cleanup) => cleanup());
    });
  }

  private listen(face: HTMLElement): (() => void)[] {
    const dialog = face.closest('dialog');
    // Height changes come from what the person does there; the content settling while the dialog
    // opens never animates.
    const arm = () => {
      this.armed = true;
      face.classList.add('is-sized');
      dialog?.removeEventListener('pointerdown', arm);
      dialog?.removeEventListener('keydown', arm);
    };
    dialog?.addEventListener('pointerdown', arm);
    dialog?.addEventListener('keydown', arm);
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === face && event.propertyName === 'height') {
        this.endResizing();
      }
    };
    face.addEventListener('transitionend', onTransitionEnd);
    return [
      () => dialog?.removeEventListener('pointerdown', arm),
      () => dialog?.removeEventListener('keydown', arm),
      () => face.removeEventListener('transitionend', onTransitionEnd),
    ];
  }

  private measure(): void {
    const face = this.config.face();
    if (!face) {
      return;
    }
    const scroller = this.config.scroller?.() ?? face;
    if (this.mobile()) {
      face.style.height = '';
      scroller.classList.remove('capped', 'is-resizing');
      this.cappedState.set(false);
      return;
    }
    const needed = this.config.measure();
    if (needed === null) {
      return;
    }
    if (this.config.cap !== undefined) {
      const capped = Math.ceil(needed) > window.innerHeight - this.config.cap;
      scroller.classList.toggle('capped', capped);
      this.cappedState.set(capped);
    }
    const next = `${Math.max(this.config.min ?? 0, Math.ceil(needed))}px`;
    if (next === face.style.height) {
      return;
    }
    if (this.armed && !this.reducedMotion()) {
      // Cleared when the height transition ends, or by the timer if it never runs (clamped by
      // max-height, interrupted).
      scroller.classList.add('is-resizing');
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.endResizing(), RESIZE_FALLBACK_MS);
    }
    face.style.height = next;
  }

  private endResizing(): void {
    clearTimeout(this.resizeTimer);
    const face = this.config.face();
    (this.config.scroller?.() ?? face)?.classList.remove('is-resizing');
  }
}

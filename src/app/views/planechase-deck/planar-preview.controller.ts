import {
  DestroyRef,
  Injectable,
  Injector,
  Signal,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import type { PlanarCard, PlanarSet } from '@data/planechase/planar-card.model';
import { visibleOrder } from '@utils/planar-preview.util';
import { MOBILE_QUERY } from '@shared/ds/media-query';

/** How long a resting pointer waits before the popover opens (FR-005). */
const HOVER_OPEN_MS = 300;
/** How long the popover stays after the pointer leaves the tile and the popover (FR-006). */
const HOVER_CLOSE_MS = 150;

export interface PreviewContext {
  sets: Signal<readonly PlanarSet[]>;
  collapsed: Signal<ReadonlySet<string>>;
  confirming: Signal<boolean>;
  /** The tile's focusable button, for focus return after the dialog closes. */
  tileFor: (id: string) => HTMLElement | undefined;
}

export interface PreviewState {
  id: string;
  mode: 'popover' | 'dialog';
}

// The deck settings' card preview state (research R9): at most one preview (FR-012), the hover
// timers, the popover's anchor, and the dialog's history entry, so the system back button closes
// the dialog instead of the page (R6). Provided by `PlanechaseDeck`, so it lives and dies with it.
@Injectable()
export class PlanarPreviewController {
  private readonly injector = inject(Injector);
  private readonly context = signal<PreviewContext | null>(null);

  private readonly state = signal<PreviewState | null>(null);
  readonly preview = this.state.asReadonly();
  private readonly variantSignal = signal<'narrow' | 'wide'>('wide');
  /** The dialog's layout, read once when it opens and kept while it's open. */
  readonly variant = this.variantSignal.asReadonly();
  private readonly anchorSignal = signal<HTMLElement | null>(null);
  /** The popover's tile, for placement. */
  readonly anchor = this.anchorSignal.asReadonly();

  private readonly visibleCards = computed(() => {
    const context = this.context();
    return context ? visibleOrder(context.sets(), context.collapsed()) : [];
  });
  readonly current = computed<PlanarCard | null>(() => {
    const id = this.state()?.id;
    const sets = this.context()?.sets() ?? [];
    return id === undefined ? null : (sets.flatMap((set) => set.cards).find((card) => card.id === id) ?? null);
  });
  /** 1-based, among the visible tiles. */
  readonly position = computed(() => {
    const id = this.state()?.id;
    const cards = this.visibleCards();
    const index = cards.findIndex((card) => card.id === id);
    return index < 0 ? null : { index: index + 1, total: cards.length };
  });
  readonly hasPrevious = computed(() => (this.position()?.index ?? 1) > 1);
  readonly hasNext = computed(() => {
    const position = this.position();
    return !!position && position.index < position.total;
  });

  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private historyPushed = false;
  private readonly onEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.close();
    }
  };
  private readonly onPopState = () => {
    this.historyPushed = false;
    this.close();
  };

  constructor() {
    // FR-013: the restart confirm, or collapsing the card's set (its tile leaves the visible
    // order), closes any preview.
    effect(() => {
      const context = this.context();
      if (context && this.state() && (context.confirming() || !this.position())) {
        untracked(() => this.close({ restoreFocus: false }));
      }
    });
    inject(DestroyRef).onDestroy(() => this.close({ restoreFocus: false }));
  }

  connect(context: PreviewContext): void {
    this.context.set(context);
  }

  /** A mouse or pen rests on a tile: open after 300 ms, or switch at once if a popover is open. */
  hoverTile(id: string, tile: HTMLElement): void {
    if (!this.canOpen() || this.state()?.mode === 'dialog') {
      return;
    }
    this.clearTimer('close');
    if (this.state()?.mode === 'popover') {
      this.anchorSignal.set(tile);
      this.state.set({ id, mode: 'popover' });
      return;
    }
    this.clearTimer('open');
    this.openTimer = setTimeout(() => {
      this.openTimer = null;
      if (this.canOpen() && !this.state()) {
        this.anchorSignal.set(tile);
        this.setState({ id, mode: 'popover' });
      }
    }, HOVER_OPEN_MS);
  }

  leaveTile(): void {
    this.scheduleClose();
  }

  leavePopover(): void {
    this.scheduleClose();
  }

  enterPopover(): void {
    this.clearTimer('close');
  }

  /** Long-press, right-click, Menu or Shift+F10: the dialog replaces any popover. */
  openDialog(id: string): void {
    if (!this.canOpen()) {
      return;
    }
    this.clearTimer('open');
    this.clearTimer('close');
    this.anchorSignal.set(null);
    if (this.state()?.mode !== 'dialog') {
      this.variantSignal.set(typeof matchMedia === 'function' && matchMedia(MOBILE_QUERY).matches ? 'narrow' : 'wide');
    }
    this.setState({ id, mode: 'dialog' });
    if (!this.historyPushed) {
      history.pushState({ ...history.state, planarPreview: true }, '');
      this.historyPushed = true;
      window.addEventListener('popstate', this.onPopState);
    }
  }

  previous(): void {
    this.step(-1);
  }

  next(): void {
    this.step(1);
  }

  /** Any close path. A closed dialog hands focus to the tile of the card it showed (FR-011). */
  close({ restoreFocus = true } = {}): void {
    const was = this.state();
    this.clearTimer('open');
    this.clearTimer('close');
    this.anchorSignal.set(null);
    this.setState(null);
    if (was?.mode !== 'dialog') {
      return;
    }
    window.removeEventListener('popstate', this.onPopState);
    if (this.historyPushed && history.state?.planarPreview) {
      history.back();
    }
    this.historyPushed = false;
    if (restoreFocus) {
      afterNextRender(() => this.focusTile(was.id), { injector: this.injector });
    }
  }

  private canOpen(): boolean {
    return !this.context()?.confirming();
  }

  private step(delta: number): void {
    const state = this.state();
    const position = this.position();
    const target = position && this.visibleCards()[position.index - 1 + delta];
    if (state && target) {
      this.state.set({ id: target.id, mode: state.mode });
    }
  }

  private scheduleClose(): void {
    this.clearTimer('open');
    if (this.state()?.mode !== 'popover') {
      return;
    }
    this.clearTimer('close');
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      this.close();
    }, HOVER_CLOSE_MS);
  }

  private clearTimer(which: 'open' | 'close'): void {
    const timer = which === 'open' ? this.openTimer : this.closeTimer;
    if (timer !== null) {
      clearTimeout(timer);
    }
    if (which === 'open') {
      this.openTimer = null;
    } else {
      this.closeTimer = null;
    }
  }

  /** Sets the preview and keeps the popover's document Esc listener attached only while it shows. */
  private setState(next: PreviewState | null): void {
    const wasPopover = this.state()?.mode === 'popover';
    const isPopover = next?.mode === 'popover';
    this.state.set(next);
    if (isPopover && !wasPopover) {
      document.addEventListener('keydown', this.onEscape);
    } else if (!isPopover && wasPopover) {
      document.removeEventListener('keydown', this.onEscape);
    }
  }

  /** Focuses the tile and, if it's out of view, centers it in the view area (never scrollIntoView). */
  private focusTile(id: string): void {
    const tile = this.context()?.tileFor(id);
    if (!tile) {
      return;
    }
    tile.focus({ preventScroll: true });
    const area = tile.closest('main');
    if (!area) {
      return;
    }
    const box = tile.getBoundingClientRect();
    const view = area.getBoundingClientRect();
    if (box.top < view.top || box.bottom > view.bottom) {
      area.scrollTop += box.top - view.top - (view.height - box.height) / 2;
    }
  }
}

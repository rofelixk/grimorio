import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import type { PlanarCard } from '../../../core/data/planechase/planar-card.model';
import { DECK, PLANAR_CARD } from '@utils/planechase-copy';
import { PlanarImage } from '@shared/gameplay/planar-image/planar-image';

/** A touch hold opens the preview after this long (FR-008). */
const HOLD_MS = 500;
/** Moving farther than this cancels a hold: the finger is scrolling. */
const HOLD_TOLERANCE_PX = 8;

// A deck-settings tile (DESIGN.md "Card tile"): the card image as an on/off toggle, loaded only
// near the viewport. Without an image, the frame shows the card name (006 FR-017). It also reports
// the preview gestures (research R3): a resting mouse or pen (`hoverStart`/`hoverEnd`), and a touch
// hold, right-click, Menu or Shift+F10 (`previewRequested`). A fired hold swallows the click that
// follows it, so it never toggles.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planar-tile',
  imports: [PlanarImage],
  templateUrl: './planar-tile.html',
  styleUrl: './planar-tile.scss',
  host: { '[attr.data-card-id]': 'card().id' },
})
export class PlanarTile {
  readonly card = input.required<PlanarCard>();
  readonly on = input.required<boolean>();
  /** Its popover is open: keeps the hover glow (FR-006). */
  readonly previewing = input(false);
  /** The open popover's id, added to the button's description. */
  readonly describedBy = input<string | null>(null);
  readonly toggled = output<void>();
  readonly hoverStart = output<HTMLElement>();
  readonly hoverEnd = output<void>();
  readonly previewRequested = output<void>();

  protected readonly copy = DECK;
  protected readonly label = computed(
    () => `${this.card().name}, ${this.card().kind === 'phenomenon' ? PLANAR_CARD.phenomenon : PLANAR_CARD.plane}`,
  );
  protected readonly keysId = computed(() => `tile-keys-${this.card().id}`);
  protected readonly description = computed(() => [this.keysId(), this.describedBy()].filter(Boolean).join(' '));
  protected readonly holding = signal(false);

  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private holdStart = { x: 0, y: 0 };
  private holdFired = false;
  private lastPointerType = '';
  /** Menu / Shift+F10 already opened the preview; the contextmenu that may follow is a duplicate. */
  private keyHandled = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelHold());
  }

  protected onClick(): void {
    if (this.holdFired) {
      this.holdFired = false;
      return;
    }
    this.toggled.emit();
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (isHover(event)) {
      this.hoverStart.emit(event.currentTarget as HTMLElement);
    }
  }

  protected onPointerLeave(event: PointerEvent): void {
    this.cancelHold();
    if (isHover(event)) {
      this.hoverEnd.emit();
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    // Some mobile browsers send no click after a long-press, so the next real tap must toggle.
    this.holdFired = false;
    this.keyHandled = false;
    this.lastPointerType = event.pointerType;
    if (event.pointerType !== 'touch') {
      return;
    }
    this.cancelHold();
    this.holdStart = { x: event.clientX, y: event.clientY };
    this.holding.set(true);
    this.holdTimer = setTimeout(() => {
      this.holdTimer = null;
      this.holdFired = true;
      this.holding.set(false);
      this.previewRequested.emit();
    }, HOLD_MS);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (
      this.holdTimer !== null &&
      Math.hypot(event.clientX - this.holdStart.x, event.clientY - this.holdStart.y) > HOLD_TOLERANCE_PX
    ) {
      this.cancelHold();
    }
  }

  protected cancelHold(): void {
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    this.holding.set(false);
  }

  /** Never the browser's menu. A touch hold opens through its timer; anything else opens here. */
  protected onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    if (this.keyHandled) {
      this.keyHandled = false;
      return;
    }
    const type = (event as Partial<PointerEvent>).pointerType || this.lastPointerType;
    if (type !== 'touch') {
      this.previewRequested.emit();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
      event.preventDefault();
      this.keyHandled = true;
      this.previewRequested.emit();
    }
  }
}

const isHover = (event: PointerEvent) => event.pointerType === 'mouse' || event.pointerType === 'pen';

// Shared by FilterSelect and AppSelect: estimates whether a dropdown panel
// fits below its trigger before the panel is actually rendered (option rows
// aren't in the DOM yet at that point), so the panel can flip above the
// trigger, or clamp its own height, instead of ever growing the page — or,
// when the trigger sits inside a scrolling container (e.g. a modal's
// scroll-body), instead of being clipped by that container's own bounds and
// forcing an internal scrollbar.
import { ElementRef, signal, WritableSignal } from '@angular/core';

// Approximate rendered height of one option row (min-height + gap) from the
// shared .dropdown-option mixin in src/styles/_dropdown.scss.
const ROW_HEIGHT_PX = 35;
const PANEL_PADDING_PX = 8;
const VIEWPORT_MARGIN_PX = 16;

export interface DropdownPlacement {
  up: boolean;
  maxHeightPx: number | null;
}

export function computeDropdownPlacement(triggerEl: HTMLElement, optionCount: number): DropdownPlacement {
  const rect = triggerEl.getBoundingClientRect();
  const bounds = getVisibleBounds(triggerEl);
  const estimatedHeight = optionCount * ROW_HEIGHT_PX + PANEL_PADDING_PX;
  const spaceBelow = bounds.bottom - rect.bottom - VIEWPORT_MARGIN_PX;
  const spaceAbove = rect.top - bounds.top - VIEWPORT_MARGIN_PX;

  const fitsBelow = estimatedHeight <= spaceBelow;
  const up = !fitsBelow && spaceAbove > spaceBelow;
  return {
    up,
    maxHeightPx: fitsBelow ? null : Math.max(up ? spaceAbove : spaceBelow, 0),
  };
}

export interface PanelPlacementState {
  panelUp: WritableSignal<boolean>;
  panelMaxHeight: WritableSignal<number | null>;
  // Recomputes panelUp/panelMaxHeight from the trigger's current position —
  // call right before opening (placement depends on where the trigger sits
  // in the viewport right now, not on where it was last time the panel
  // opened).
  updatePlacement(): void;
}

// Bundles panelUp/panelMaxHeight with the logic that recomputes them, shared
// by FilterSelect and AppSelect's otherwise-identical placement wiring —
// each still owns its own `open` state and toggle()/pick() semantics.
export function createPanelPlacementState(
  elementRef: ElementRef<HTMLElement>,
  optionCount: () => number,
): PanelPlacementState {
  const panelUp = signal(false);
  const panelMaxHeight = signal<number | null>(null);

  return {
    panelUp,
    panelMaxHeight,
    updatePlacement(): void {
      const placement = computeDropdownPlacement(elementRef.nativeElement, optionCount());
      panelUp.set(placement.up);
      panelMaxHeight.set(placement.maxHeightPx);
    },
  };
}

// Intersects the viewport with every scrolling ancestor's own box — a panel
// that only checks window bounds can still get clipped (and make its
// scrolling ancestor grow a scrollbar) by a nearer container with its own
// overflow-y: auto/scroll, like a modal's fixed-height scroll-body.
function getVisibleBounds(el: HTMLElement): { top: number; bottom: number } {
  let top = 0;
  let bottom = window.innerHeight;
  let node = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      const rect = node.getBoundingClientRect();
      top = Math.max(top, rect.top);
      bottom = Math.min(bottom, rect.bottom);
    }
    node = node.parentElement;
  }
  return { top, bottom };
}

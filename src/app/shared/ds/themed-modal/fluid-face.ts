import { ElementRef, Signal, afterRenderEffect } from '@angular/core';
import { FluidHeight } from '@shared/ds/fluid-height';

const MIN_FACE_HEIGHT = 460;
// Form pane chrome around the measured content: 12px top padding + 44px close row + 24px
// bottom padding, plus 16px between the content and the prompt.
const PANE_CHROME = 12 + 44 + 24;
const PROMPT_GAP = 16;
// ThemedModal caps the face at 100dvh − 2 × space-6.
const FACE_VIEWPORT_MARGIN = 64;

// Tried in order, so a field or action row wins over an earlier plate button or wheel swatch.
const FOCUS_ORDER = [
  'input:not([readonly])',
  'app-action-row button:not([disabled])',
  '[role="listitem"] button:not([disabled])',
  'button:not([disabled])',
];

export interface FluidFaceRefs {
  /** `ThemedModal.face`: where the height is written. */
  face: Signal<ElementRef<HTMLElement> | undefined>;
  /** The form pane: scrolls only when capped, and hides its scrollbar while resizing. */
  pane: Signal<ElementRef<HTMLElement> | undefined>;
  /** The form pane's content, measured for the face height and searched for the first field. */
  content: Signal<ElementRef<HTMLElement> | undefined>;
  /** The pinned bottom prompt, if one shows. */
  prompt: Signal<ElementRef<HTMLElement> | undefined>;
  /** Changes whenever a new screen appears ('' while closed), to focus its first field. */
  screenKey: Signal<string>;
}

// Behavior shared by both themed modals (research R19): the desktop face follows its content
// (never below 460px, scrolling only when even the tallest face can't fit it), and the first
// field or action row takes focus on every new screen. Create it in a component constructor.
export class FluidFace {
  constructor(refs: FluidFaceRefs) {
    new FluidHeight({
      face: () => refs.face()?.nativeElement,
      scroller: () => refs.pane()?.nativeElement,
      observe: () => [refs.content()?.nativeElement, refs.prompt()?.nativeElement],
      measure: () => {
        const content = refs.content()?.nativeElement;
        if (!content) {
          return null;
        }
        const prompt = refs.prompt()?.nativeElement;
        return PANE_CHROME + content.offsetHeight + (prompt ? PROMPT_GAP + prompt.offsetHeight : 0);
      },
      min: MIN_FACE_HEIGHT,
      cap: FACE_VIEWPORT_MARGIN,
    });

    let lastScreen = '';
    afterRenderEffect(() => {
      const screen = refs.screenKey();
      if (screen && screen !== lastScreen) {
        const content = refs.content()?.nativeElement;
        for (const selector of FOCUS_ORDER) {
          const target = content?.querySelector<HTMLElement>(selector);
          if (target) {
            target.focus();
            break;
          }
        }
      }
      lastScreen = screen;
    });
  }
}

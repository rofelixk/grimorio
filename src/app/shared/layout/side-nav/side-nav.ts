import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ShellState } from '@services/shell-state.service';
import { SHELL } from '@utils/entry-copy';
import { NavLinks } from '@shared/layout/nav-links/nav-links';

/** Matches `--delay-nav-leave`. */
const LEAVE_DELAY_MS = 120;

// The wide side nav (DESIGN.md "Side nav", research R13): a collapsed thread that expands over
// the content on hover or focus, or stays open when pinned. The spacer follows `pinned` only,
// so hovering never moves the content (SC-007).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-side-nav',
  imports: [NavLinks],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss',
})
export class SideNav {
  protected readonly shell = inject(ShellState);
  protected readonly copy = SHELL;

  private readonly hover = signal(false);
  private readonly focusWithin = signal(false);
  protected readonly expanded = computed(() => this.shell.pinned() || this.hover() || this.focusWithin());

  private leaveTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly nav = viewChild.required<ElementRef<HTMLElement>>('nav');

  constructor() {
    // Pinning by clicking the thread is a pointer-only shortcut; keyboard users have the pin
    // button, so this listener is attached here rather than in the template.
    afterNextRender(() => {
      this.nav().nativeElement.addEventListener('click', (event) => this.onClick(event));
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.leaveTimer));
  }

  protected onPointerEnter(event: PointerEvent): void {
    // A tap on a touch screen pins the nav (click) instead of flashing it open.
    if (event.pointerType === 'touch') {
      return;
    }
    clearTimeout(this.leaveTimer);
    this.hover.set(true);
  }

  protected onPointerLeave(): void {
    clearTimeout(this.leaveTimer);
    this.leaveTimer = setTimeout(() => this.hover.set(false), LEAVE_DELAY_MS);
  }

  protected onFocusIn(): void {
    this.focusWithin.set(true);
  }

  protected onFocusOut(event: FocusEvent, nav: HTMLElement): void {
    if (!(event.relatedTarget instanceof Node && nav.contains(event.relatedTarget))) {
      this.focusWithin.set(false);
    }
  }

  // A click on the nav's background (the thread), not on a link or the pin button, pins it.
  private onClick(event: MouseEvent): void {
    if (event.target instanceof Element && !event.target.closest('a, button')) {
      this.shell.setPinned(true);
    }
  }

  protected togglePin(): void {
    this.shell.setPinned(!this.shell.pinned());
  }
}

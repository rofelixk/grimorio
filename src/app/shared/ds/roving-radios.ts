import { Directive, ElementRef, inject, input, output } from '@angular/core';
import { rovingIndex } from '@utils/roving.util';

const ARROWS = new Set(['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']);

// Radio-group keys (research R8), on the `role="radiogroup"` element: arrows move and select the
// next or previous `[role="radio"]` descendant, wrapping; Home/End jump to the ends; selection
// follows focus. With nothing selected, an arrow selects the focused radio itself (the group's
// one tab stop). Roving `tabindex` and `aria-checked` stay in each template.
@Directive({
  selector: '[appRovingRadios]',
  host: { '(keydown)': 'onKeydown($event)' },
})
export class RovingRadios {
  /** Index of the checked `[role="radio"]` descendant; −1 = none. */
  readonly selected = input.required<number>({ alias: 'appRovingRadios' });
  /** The index to select (selection follows focus). */
  readonly radioMove = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected onKeydown(event: KeyboardEvent): void {
    const radios = Array.from(this.host.querySelectorAll<HTMLElement>('[role="radio"]'));
    const own = radios.indexOf(event.target as HTMLElement);
    if (own === -1) {
      return;
    }
    const from = this.selected();
    const target = from === -1 && ARROWS.has(event.key) ? own : rovingIndex(event.key, from, radios.length);
    if (target === null) {
      return;
    }
    event.preventDefault();
    this.radioMove.emit(target);
    radios[target].focus();
  }
}

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  Injector,
  TemplateRef,
  afterNextRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { rovingIndex } from '@utils/roving.util';

/** The trigger's face: the selected item (`let-item`). */
@Directive({ selector: 'ng-template[appSelectTrigger]' })
export class SelectTrigger {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** One option: the item (`let-item`) and whether it is the active one (`let-active="active"`). */
@Directive({ selector: 'ng-template[appSelectOption]' })
export class SelectOption {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Shown in place of the options (an error, "no match"). Present only while the caller renders it. */
@Directive({ selector: 'ng-template[appSelectEmpty]' })
export class SelectEmpty {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

let nextId = 0;

// A dropdown that can hold thumbnails and two-line options, which a native `<select>` can't
// (DESIGN.md "Select list", research R15). The trigger is a button; the popup is a `role="listbox"`
// that takes focus on open and drives `aria-activedescendant`. Arrows, Home/End move, Enter or Space
// pick, Esc closes the list and stops there (the dialog stays open), a press outside closes it, and
// focus returns to the trigger. While an `appSelectEmpty` template is rendered it replaces the options.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-select-list',
  imports: [NgTemplateOutlet],
  templateUrl: './select-list.html',
  styleUrl: './select-list.scss',
})
export class SelectList<T> {
  readonly options = input.required<readonly T[]>();
  readonly selected = model.required<T>();
  readonly key = input.required<(item: T) => string>();
  /** The trigger's accessible name. */
  readonly label = input.required<string>();
  readonly disabled = input(false);

  protected readonly triggerTemplate = contentChild(SelectTrigger);
  protected readonly optionTemplate = contentChild(SelectOption);
  protected readonly emptyTemplate = contentChild(SelectEmpty);

  protected readonly id = `grm-select-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly selectedIndex = computed(() => {
    const key = this.key();
    const current = key(this.selected());
    return this.options().findIndex((option) => key(option) === current);
  });
  protected readonly activeId = computed(() => (this.activeIndex() >= 0 ? `${this.id}-opt-${this.activeIndex()}` : null));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly popup = viewChild<ElementRef<HTMLElement>>('popup');

  constructor() {
    // A press outside the list closes it; the document listener lives only while it is open.
    effect((onCleanup) => {
      if (!this.open()) {
        return;
      }
      const onPointerDown = (event: PointerEvent) => {
        if (!this.host.contains(event.target as Node)) {
          this.open.set(false);
        }
      };
      document.addEventListener('pointerdown', onPointerDown, true);
      onCleanup(() => document.removeEventListener('pointerdown', onPointerDown, true));
    });

    // Keeps the active option in view.
    effect(() => {
      const id = this.activeId();
      if (id && this.open()) {
        queueMicrotask(() => this.host.querySelector(`#${id}`)?.scrollIntoView?.({ block: 'nearest' }));
      }
    });
  }

  protected toggle(): void {
    if (this.open()) {
      this.close(true);
    } else {
      this.openList();
    }
  }

  private openList(): void {
    if (this.disabled()) {
      return;
    }
    this.activeIndex.set(this.selectedIndex());
    this.open.set(true);
    afterNextRender(() => this.popup()?.nativeElement.focus({ preventScroll: true }), { injector: this.injector });
  }

  private close(restoreFocus: boolean): void {
    this.open.set(false);
    if (restoreFocus) {
      this.trigger().nativeElement.focus();
    }
  }

  protected pick(index: number): void {
    const item = this.options()[index];
    if (item !== undefined) {
      this.selected.set(item);
    }
    this.close(true);
  }

  private optionIndexOf(event: Event): number | null {
    const option = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
    return option ? Number(option.dataset['index']) : null;
  }

  protected onPopupClick(event: MouseEvent): void {
    const index = this.optionIndexOf(event);
    if (index !== null) {
      this.pick(index);
    }
  }

  protected onPopupPointerMove(event: PointerEvent): void {
    const index = this.optionIndexOf(event);
    if (index !== null && index !== this.activeIndex()) {
      this.activeIndex.set(index);
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.open()) {
        this.openList();
      }
    } else if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.close(false);
    }
  }

  protected onPopupKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
        return;
      case 'Tab':
        this.close(false);
        return;
      case 'Enter':
      case ' ':
        if (this.emptyTemplate() || (event.target as HTMLElement).closest('button')) {
          return;
        }
        event.preventDefault();
        if (this.activeIndex() >= 0) {
          this.pick(this.activeIndex());
        }
        return;
      default: {
        if (this.emptyTemplate() || count === 0) {
          return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          return;
        }
        const next = rovingIndex(event.key, this.activeIndex(), count);
        if (next !== null) {
          event.preventDefault();
          this.activeIndex.set(next);
        }
      }
    }
  }
}

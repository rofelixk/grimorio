import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { SelectEmpty, SelectList, SelectOption, SelectTrigger } from './select-list';

interface Item {
  id: string;
  name: string;
}

const ITEMS: Item[] = [
  { id: 'a', name: 'Alfa' },
  { id: 'b', name: 'Bravo' },
  { id: 'c', name: 'Charlie' },
];

@Component({
  imports: [SelectList, SelectTrigger, SelectOption, SelectEmpty],
  template: `
    <div tabindex="-1" (keydown)="parentKeys = parentKeys + 1">
      <app-select-list
        [options]="options()"
        [(selected)]="selected"
        [key]="key"
        label="Impressão"
        [disabled]="disabled()"
      >
        <ng-template appSelectTrigger let-item><span class="face">{{ item.name }}</span></ng-template>
        <ng-template appSelectOption let-item let-active="active">
          <span class="row" [class.act]="active">{{ item.name }}</span>
        </ng-template>
        @if (failed()) {
          <ng-template appSelectEmpty><p class="err">Falhou</p></ng-template>
        }
      </app-select-list>
    </div>
    <button class="outside">fora</button>
  `,
})
class Host {
  readonly options = signal<Item[]>(ITEMS);
  readonly selected = signal<Item>(ITEMS[0]);
  readonly disabled = signal(false);
  readonly failed = signal(false);
  readonly key = (item: Item) => item.id;
  parentKeys = 0;
}

describe('SelectList', () => {
  afterEach(() => TestBed.resetTestingModule());

  async function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector<HTMLButtonElement>('button.trigger')!;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const popup = () => el.querySelector<HTMLElement>('.popup');
    const key = async (target: HTMLElement, k: string) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      await settle();
    };
    const open = async () => {
      trigger.click();
      await settle();
    };
    return { fixture, el, host: fixture.componentInstance, trigger, popup, key, open, settle };
  }

  it('shows the selection in the trigger with listbox semantics', async () => {
    const { trigger, el } = await render();
    expect(trigger.textContent).toContain('Alfa');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-label')).toBe('Impressão');
    expect(el.querySelector('.popup')).toBeNull();
  });

  it('opens on click with the options, the selected one marked and focus in the list', async () => {
    const { trigger, popup, open, el } = await render();
    await open();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(popup()!.getAttribute('role')).toBe('listbox');
    const options = el.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(3);
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options[1].getAttribute('aria-selected')).toBe('false');
    expect(document.activeElement).toBe(popup());
    expect(popup()!.getAttribute('aria-activedescendant')).toBe(options[0].id);
  });

  it('moves with the arrows, Home and End, and picks with Enter or Space', async () => {
    const { popup, open, key, host, trigger } = await render();
    await open();
    await key(popup()!, 'ArrowDown');
    await key(popup()!, 'ArrowDown');
    expect(popup()!.getAttribute('aria-activedescendant')).toMatch(/opt-2$/);
    await key(popup()!, 'Home');
    expect(popup()!.getAttribute('aria-activedescendant')).toMatch(/opt-0$/);
    await key(popup()!, 'End');
    await key(popup()!, 'Enter');
    expect(host.selected().id).toBe('c');
    expect(popup()).toBeNull();
    expect(document.activeElement).toBe(trigger);

    await open();
    await key(popup()!, 'ArrowUp');
    await key(popup()!, ' ');
    expect(host.selected().id).toBe('b');
  });

  it('opens from the keyboard on the trigger', async () => {
    const { trigger, key, popup } = await render();
    await key(trigger, 'ArrowDown');
    expect(popup()).not.toBeNull();
  });

  it('picks by click', async () => {
    const { open, el, host } = await render();
    await open();
    el.querySelectorAll<HTMLElement>('[role="option"]')[1].click();
    expect(host.selected().id).toBe('b');
  });

  it('closes on Esc without letting the key reach a parent', async () => {
    const { open, popup, key, host, trigger } = await render();
    await open();
    await key(popup()!, 'Escape');
    expect(popup()).toBeNull();
    expect(host.parentKeys).toBe(0);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a press outside', async () => {
    const { open, popup, el, settle } = await render();
    await open();
    el.querySelector('.outside')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle();
    expect(popup()).toBeNull();
  });

  it('shows the empty template in place of the options', async () => {
    const { open, host, el, popup, settle } = await render();
    host.failed.set(true);
    await settle();
    await open();
    expect(el.querySelector('.err')?.textContent).toBe('Falhou');
    expect(el.querySelectorAll('[role="option"]')).toHaveLength(0);
    expect(popup()!.getAttribute('role')).toBeNull();
  });

  it('does not open while disabled', async () => {
    const { host, trigger, popup, settle } = await render();
    host.disabled.set(true);
    await settle();
    trigger.click();
    await settle();
    expect(popup()).toBeNull();
  });
});

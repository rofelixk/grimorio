import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CollectionColorHex } from '@models/collection.model';
import { describe, expect, it } from 'vitest';
import { ColorPicker } from './color-picker';

@Component({
  imports: [ColorPicker],
  template: `<app-color-picker [value]="value()" (valueChange)="value.set($event)" />`,
})
class Host {
  readonly value = signal<CollectionColorHex>('#3d6b85');
}

describe('ColorPicker', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const radios = () => [...el.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    const key = (key: string) => {
      el.querySelector('[role="radio"][tabindex="0"]')!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    };
    return { fixture, el, radios, key, host: fixture.componentInstance };
  }

  it('lays out 16 radios in 5/6/5, labelled by "Cor · {Nome}"', () => {
    const { el, radios } = render();
    expect(radios()).toHaveLength(16);
    expect([...el.querySelectorAll('.row')].map((row) => row.children.length)).toEqual([5, 6, 5]);
    const group = el.querySelector('[role="radiogroup"]')!;
    const label = el.querySelector(`#${group.getAttribute('aria-labelledby')}`)!;
    expect(label.textContent!.replace(/\s+/g, ' ').trim()).toBe('Cor · Azul');
    expect(radios()[5].getAttribute('aria-label')).toBe('Ônix');
    expect(radios()[5].getAttribute('title')).toBe('Ônix');
  });

  it('has a single tab stop on the checked swatch', () => {
    const { radios } = render();
    const stops = radios().filter((radio) => radio.getAttribute('tabindex') === '0');
    expect(stops).toHaveLength(1);
    expect(stops[0].getAttribute('aria-label')).toBe('Azul');
    expect(stops[0].getAttribute('aria-checked')).toBe('true');
  });

  it('emits the clicked color', () => {
    const { fixture, radios, host } = render();
    radios()[10].click();
    fixture.detectChanges();
    expect(host.value()).toBe('#8ea24a');
  });

  it('moves with the arrow keys, wrapping, and jumps with Home/End', () => {
    const { key, host, radios } = render();
    key('ArrowRight');
    expect(host.value()).toBe('#7c5aa6');
    expect(document.activeElement).toBe(radios()[2]);
    key('ArrowUp');
    key('ArrowLeft');
    key('ArrowLeft');
    expect(host.value()).toBe('#c49a3c');
    key('ArrowDown');
    expect(host.value()).toBe('#d8cdb0');
    key('End');
    expect(host.value()).toBe('#c49a3c');
    key('Home');
    expect(host.value()).toBe('#d8cdb0');
  });
});

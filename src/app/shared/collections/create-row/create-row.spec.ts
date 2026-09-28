import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CreateRow } from './create-row';

@Component({
  imports: [CreateRow],
  template: `<app-create-row [label]="label()" [sub]="sub()" (activate)="clicks = clicks + 1" />`,
})
class Host {
  readonly label = signal('Nova coleção');
  readonly sub = signal('');
  clicks = 0;
}

describe('CreateRow', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    return { fixture, button };
  }

  it('shows the label with a hidden "+" and no sub-line by default', () => {
    const { button } = render();
    expect(button.querySelector('.label')?.textContent).toBe('Nova coleção');
    expect(button.querySelector('.plus')?.getAttribute('aria-hidden')).toBe('true');
    expect(button.querySelector('.sub')).toBeNull();
  });

  it('shows the sub-line when given', () => {
    const { fixture, button } = render();
    fixture.componentInstance.label.set('Dividir em subcoleções');
    fixture.componentInstance.sub.set('As 12 cartas vão para a primeira subcoleção.');
    fixture.detectChanges();
    expect(button.querySelector('.sub')?.textContent).toBe('As 12 cartas vão para a primeira subcoleção.');
  });

  it('emits activate on click', () => {
    const { fixture, button } = render();
    button.click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });
});

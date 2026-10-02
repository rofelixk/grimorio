import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { CardViewToggle } from './card-view-toggle';

@Component({
  imports: [CardViewToggle],
  template: `<app-card-view-toggle [(mode)]="mode" />`,
})
class Host {
  readonly mode = signal<'images' | 'details'>('details');
}

describe('CardViewToggle', () => {
  afterEach(() => TestBed.resetTestingModule());

  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const radios = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    return { fixture, el, host: fixture.componentInstance, radios };
  }

  it('is a labelled radiogroup with the two options, the mode checked and roving tabindex', () => {
    const { el, radios } = render();
    expect(el.querySelector('[role="radiogroup"]')!.getAttribute('aria-label')).toBe('Exibição');
    expect(radios().map((r) => r.textContent!.trim())).toEqual(['Só imagens', 'Com detalhes']);
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true']);
    expect(radios().map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0']);
  });

  it('changes the mode on click', () => {
    const { fixture, host, radios } = render();
    radios()[0].click();
    fixture.detectChanges();
    expect(host.mode()).toBe('images');
    expect(radios()[0].getAttribute('aria-checked')).toBe('true');
  });

  it('changes the mode with the arrow keys', () => {
    const { fixture, host, radios } = render();
    radios()[1].focus();
    radios()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(host.mode()).toBe('images');
  });
});

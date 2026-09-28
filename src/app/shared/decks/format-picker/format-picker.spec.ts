import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import type { DeckFormatId } from '@models/deck.model';
import { FormatPicker } from './format-picker';

function render(value: DeckFormatId = 'commander') {
  const fixture = TestBed.createComponent(FormatPicker);
  fixture.componentRef.setInput('value', value);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const radios = () => [...el.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  const checked = () => el.querySelector('[aria-checked="true"]')?.textContent?.trim();
  const rules = () => [...el.querySelectorAll('.rules li')].map((li) => li.textContent?.trim());
  const key = (key: string) => {
    el.querySelector('[aria-checked="true"]')!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };
  return { fixture, el, radios, checked, rules, key };
}

describe('FormatPicker', () => {
  it('renders the 8 formats in order', () => {
    const { radios } = render();
    expect(radios().map((r) => r.textContent?.trim())).toEqual([
      'Commander', 'Pauper', 'Modern', 'Standard', 'Pioneer', 'Legacy', 'Vintage', 'Casual',
    ]);
  });

  it('labels the group with the selected format', () => {
    const { el } = render('pauper');
    const group = el.querySelector('[role="radiogroup"]')!;
    expect(el.querySelector(`#${group.getAttribute('aria-labelledby')}`)?.textContent?.trim()).toBe('Formato · Pauper');
  });

  it('changes the value and the rules plate on click', () => {
    const { fixture, radios, rules } = render();
    expect(rules()[0]).toBe('Exatamente 100 cartas, contando o comandante.');

    radios()[6].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('vintage');
    expect(rules()).toHaveLength(5);
    expect(rules()[4]).toBe('Cartas da lista de restritas: só 1 cópia.');
  });

  it('moves and selects with the arrow keys, wrapping, and jumps with Home/End', () => {
    const { checked, key } = render('casual');
    key('ArrowRight');
    expect(checked()).toBe('Commander');
    key('ArrowLeft');
    expect(checked()).toBe('Casual');
    key('ArrowUp');
    expect(checked()).toBe('Vintage');
    key('Home');
    expect(checked()).toBe('Commander');
    key('End');
    expect(checked()).toBe('Casual');
  });

  it('makes only the selected radio tabbable', () => {
    const { radios } = render('modern');
    expect(radios().map((r) => r.tabIndex)).toEqual([-1, -1, 0, -1, -1, -1, -1, -1]);
  });
});

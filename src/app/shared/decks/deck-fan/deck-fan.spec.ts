import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DeckFan } from './deck-fan';

describe('DeckFan', () => {
  it('renders three sleeves and the featured-card placeholder, hidden from assistive tech', () => {
    const fixture = TestBed.createComponent(DeckFan);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelectorAll('.sleeve')).toHaveLength(3);
    expect(el.textContent).toContain('Carta em destaque');
    expect(el.textContent).toContain('Chega com as cartas do deck.');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('sizes the host by the scale', () => {
    const fixture = TestBed.createComponent(DeckFan);
    fixture.componentRef.setInput('scale', 0.75);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).style.getPropertyValue('--scale')).toBe('0.75');
  });
});

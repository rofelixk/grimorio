import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import type { Deck } from '@models/deck.model';
import { DeckTile } from './deck-tile';

const deck: Deck = { id: 'd1', name: 'Krenko goblins', format: 'commander', updatedAt: '2026-01-01T00:00:00.000Z' };

function render(value: Deck = deck) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(DeckTile);
  fixture.componentRef.setInput('deck', value);
  fixture.detectChanges();
  return fixture;
}

describe('DeckTile', () => {
  it('links to the deck page with the sweep info', () => {
    const fixture = render();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    const routerLink = fixture.debugElement.query(By.directive(RouterLink)).injector.get(RouterLink);

    expect(link.getAttribute('href')).toBe('/decks/d1');
    expect(routerLink.info).toEqual({ sweep: true });
  });

  it('names the link "{nome}, {formato}"', () => {
    const link: HTMLAnchorElement = render().nativeElement.querySelector('a');
    expect(link.getAttribute('aria-label')).toBe('Krenko goblins, Commander');
  });

  it('shows the name and the format name', () => {
    const el: HTMLElement = render({ ...deck, format: 'vintage' }).nativeElement;
    expect(el.querySelector('.name')?.textContent).toBe('Krenko goblins');
    expect(el.querySelector('.format')?.textContent).toBe('Vintage');
  });
});

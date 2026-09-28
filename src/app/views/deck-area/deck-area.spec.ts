import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DeckArea } from './deck-area';

describe('DeckArea', () => {
  it('renders the title', () => {
    const fixture = TestBed.createComponent(DeckArea);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBe('Decks');
  });
});

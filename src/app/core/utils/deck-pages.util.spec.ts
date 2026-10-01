import { describe, expect, it } from 'vitest';
import { type DeckPlace, DECK_PAGES } from './deck-pages.util';
import { type PageNav, SWEEP_INFO } from './page-change.util';

const list: DeckPlace = { kind: 'list' };
const deck: DeckPlace = { kind: 'deck', id: 'd1' };
const other: DeckPlace = { kind: 'deck', id: 'd2' };

const imperative = (info?: unknown): PageNav => ({ trigger: 'imperative', info });
const popstate: PageNav = { trigger: 'popstate' };

describe('DECK_PAGES', () => {
  it('starts on the list', () => {
    expect(DECK_PAGES.initial).toEqual(list);
  });

  it('opens from a deck tile', () => {
    expect(DECK_PAGES.sweep(list, deck, imperative(SWEEP_INFO))).toBe('open');
  });

  it('does not sweep on browser forward or a typed address into a deck', () => {
    expect(DECK_PAGES.sweep(list, deck, popstate)).toBeNull();
    expect(DECK_PAGES.sweep(list, deck, imperative())).toBeNull();
    expect(DECK_PAGES.sweep(list, deck, null)).toBeNull();
  });

  it('closes from the back link or the side nav', () => {
    expect(DECK_PAGES.sweep(deck, list, imperative())).toBe('close');
  });

  it('closes on browser/Android back', () => {
    expect(DECK_PAGES.sweep(deck, list, popstate)).toBe('close');
  });

  it('never sweeps between two decks', () => {
    expect(DECK_PAGES.sweep(deck, other, imperative(SWEEP_INFO))).toBeNull();
  });

  it('treats the same kind and id as the same page', () => {
    expect(DECK_PAGES.same(deck, { kind: 'deck', id: 'd1' })).toBe(true);
    expect(DECK_PAGES.same(list, { kind: 'list' })).toBe(true);
    expect(DECK_PAGES.same(deck, other)).toBe(false);
    expect(DECK_PAGES.same(deck, list)).toBe(false);
  });
});

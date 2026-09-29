import { describe, expect, it } from 'vitest';
import { type DeckNav, type DeckPlace, turnFor } from './deck-turn.util';

const list: DeckPlace = { kind: 'list' };
const deck: DeckPlace = { kind: 'deck', id: 'd1' };
const other: DeckPlace = { kind: 'deck', id: 'd2' };

const imperative = (extras: Partial<DeckNav> = {}): DeckNav => ({ trigger: 'imperative', ...extras });
const popstate: DeckNav = { trigger: 'popstate' };

describe('turnFor (research R8)', () => {
  it('opens from a deck tile', () => {
    expect(turnFor(list, deck, imperative({ info: { deckTurn: true } }))).toBe('open');
  });

  it('does not turn on browser forward into a deck', () => {
    expect(turnFor(list, deck, popstate)).toBeNull();
  });

  it('does not turn on the first place shown (typed address, first load)', () => {
    expect(turnFor(null, deck, imperative())).toBeNull();
    expect(turnFor(null, list, imperative())).toBeNull();
  });

  it('closes from the back link or the side nav', () => {
    expect(turnFor(deck, list, imperative())).toBe('close');
  });

  it('closes on browser/Android back, which the router marks replaceUrl', () => {
    expect(turnFor(deck, list, popstate)).toBe('close');
    expect(turnFor(deck, list, { ...popstate, replaceUrl: true })).toBe('close');
  });

  it('does not turn when landing on the list after a delete', () => {
    expect(turnFor(deck, list, imperative({ info: { deckTurn: false } }))).toBeNull();
  });

  it('does not turn on the missing-deck redirect', () => {
    expect(turnFor(deck, list, imperative({ replaceUrl: true }))).toBeNull();
  });

  it('never turns between two decks or to the same place', () => {
    expect(turnFor(deck, other, imperative({ info: { deckTurn: true } }))).toBeNull();
    expect(turnFor(deck, { kind: 'deck', id: 'd1' }, imperative())).toBeNull();
    expect(turnFor(list, list, imperative())).toBeNull();
  });
});

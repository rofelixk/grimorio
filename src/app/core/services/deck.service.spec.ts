import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DeckCard } from '../models/deck.model';
import { DeckService } from './deck.service';

const ownedCard: DeckCard = { id: 'entry-1', source: 'owned', cardEntryId: 'entry-1' };

describe('DeckService', () => {
  let service: DeckService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeckService);
  });

  it('starts empty when nothing is persisted', () => {
    expect(service.decks()).toEqual([]);
  });

  it('adds a deck and persists it to localStorage', () => {
    const added = service.add({ name: 'Atraxa Superfriends', commander: null, cards: [] });

    expect(service.decks()).toEqual([added]);
    expect(JSON.parse(localStorage.getItem('grimorio.decks')!)).toEqual([added]);
  });

  it('removes a deck', () => {
    const added = service.add({ name: 'Atraxa Superfriends', commander: null, cards: [] });

    service.remove(added.id);

    expect(service.decks()).toEqual([]);
  });

  it('finds a deck by id', () => {
    const added = service.add({ name: 'Atraxa Superfriends', commander: null, cards: [] });

    expect(service.byId(added.id)()).toEqual(added);
    expect(service.byId('missing')()).toBeUndefined();
  });

  it('sets and clears the commander', () => {
    const deck = service.add({ name: 'Atraxa Superfriends', commander: null, cards: [] });

    service.setCommander(deck.id, ownedCard);
    expect(service.byId(deck.id)()?.commander).toEqual(ownedCard);

    service.setCommander(deck.id, null);
    expect(service.byId(deck.id)()?.commander).toBeNull();
  });

  it('adds and removes a card from a deck', () => {
    const deck = service.add({ name: 'Atraxa Superfriends', commander: null, cards: [] });

    service.addCard(deck.id, ownedCard);
    expect(service.byId(deck.id)()?.cards).toEqual([ownedCard]);

    service.removeCard(deck.id, ownedCard.id);
    expect(service.byId(deck.id)()?.cards).toEqual([]);
  });
});

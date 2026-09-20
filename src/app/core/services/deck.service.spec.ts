import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DeckCard } from '@models/deck.model';
import { resetGrimorioDbForTests } from '../db/grimorio-db';
import { DeckService } from './deck.service';

const ownedCard: DeckCard = { id: 'entry-1', source: 'owned', cardEntryId: 'entry-1' };

describe('DeckService', () => {
  let service: DeckService;

  beforeEach(async () => {
    localStorage.clear();
    await resetGrimorioDbForTests();
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeckService);
    await service.whenReady();
  });

  afterEach(async () => {
    // Ensure any write left pending by a test that didn't await it lands before
    // the next test's beforeEach deletes and recreates the database.
    await service.flush();
  });

  it('starts empty when nothing is persisted', () => {
    expect(service.decks()).toEqual([]);
  });

  it('adds a deck and persists it to IndexedDB', async () => {
    const added = service.add({ name: 'Atraxa Superfriends', commander: null, cards: [] });

    expect(service.decks()).toEqual([added]);
    await service.flush();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(DeckService);
    await reloaded.whenReady();
    expect(reloaded.decks()).toEqual([added]);
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

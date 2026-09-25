import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { CardService } from './card.service';
import { DeckService } from './deck.service';
import { StorageLocationService } from './storage-location.service';

describe('entity services load() isolation', () => {
  let cards: CardService;
  let locations: StorageLocationService;
  let decks: DeckService;

  const loadAll = async (profileId: string | null) => {
    await Promise.all([cards.flush(), locations.flush(), decks.flush()]);
    await Promise.all([cards.load(profileId), locations.load(profileId), decks.load(profileId)]);
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    cards = TestBed.inject(CardService);
    locations = TestBed.inject(StorageLocationService);
    decks = TestBed.inject(DeckService);
    await loadAll('A');
  });

  it("hides profile A's data under profile B and with no profile, and restores it for A", async () => {
    const card = cards.add(mockCardEntryWithoutId());
    const location = locations.add({ name: 'Caixa A', parentId: null });
    const deck = decks.add({ name: 'Deck A', commander: null, cards: [] });

    await loadAll('B');
    expect(cards.cards()).toEqual([]);
    expect(locations.locations()).toEqual([]);
    expect(decks.decks()).toEqual([]);

    await loadAll(null);
    expect(cards.cards()).toEqual([]);
    expect(locations.locations()).toEqual([]);
    expect(decks.decks()).toEqual([]);

    await loadAll('A');
    expect(cards.cards()).toEqual([card]);
    expect(locations.locations()).toEqual([location]);
    expect(decks.decks()).toEqual([deck]);
  });

  it('keeps writes made under B in B', async () => {
    await loadAll('B');
    const card = cards.add(mockCardEntryWithoutId({ name: 'Sol Ring' }));

    await loadAll('A');
    expect(cards.cards()).toEqual([]);

    await loadAll('B');
    expect(cards.cards()).toEqual([card]);
  });

  it('clears the signal synchronously when a load starts', () => {
    cards.add(mockCardEntryWithoutId());

    const pending = cards.load('B');
    expect(cards.cards()).toEqual([]);
    return pending;
  });

  it('counts user mutations but not applied sync results', () => {
    const before = cards.changeCount();
    const added = cards.add(mockCardEntryWithoutId());
    cards.update(added.id, { quantity: 2 });
    cards.remove(added.id);
    expect(cards.changeCount()).toBe(before + 3);

    cards.applySyncResult([added]);
    locations.applySyncResult([]);
    expect(cards.changeCount()).toBe(before + 3);
    expect(locations.changeCount()).toBe(0);
  });
});

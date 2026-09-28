import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { CardService } from './card.service';
import { CollectionService } from './collection.service';
import { DeckService } from './deck.service';

describe('entity services load() isolation', () => {
  let cards: CardService;
  let collections: CollectionService;
  let decks: DeckService;

  const loadAll = async (profileId: string | null) => {
    await Promise.all([cards.flush(), collections.flush(), decks.flush()]);
    await Promise.all([cards.load(profileId), collections.load(profileId), decks.load(profileId)]);
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    cards = TestBed.inject(CardService);
    collections = TestBed.inject(CollectionService);
    decks = TestBed.inject(DeckService);
    await loadAll('A');
  });

  it("hides profile A's data under profile B and with no profile, and restores it for A", async () => {
    const card = cards.add(mockCardEntryWithoutId());
    collections.applySyncResult([
      { id: 'col-a', name: 'Caixa A', color: '#d8cdb0', parentId: null, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    const result = decks.create({ name: 'Deck A', format: 'commander' });
    if (!result.ok) throw new Error(result.error);
    const deck = result.deck;

    await loadAll('B');
    expect(cards.cards()).toEqual([]);
    expect(collections.collections()).toEqual([]);
    expect(decks.decks()).toEqual([]);

    await loadAll(null);
    expect(cards.cards()).toEqual([]);
    expect(collections.collections()).toEqual([]);
    expect(decks.decks()).toEqual([]);

    await loadAll('A');
    expect(cards.cards()).toEqual([card]);
    expect(collections.collections()).toEqual([
      { id: 'col-a', name: 'Caixa A', color: '#d8cdb0', parentId: null, updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
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
    collections.applySyncResult([]);
    expect(cards.changeCount()).toBe(before + 3);
    expect(collections.changeCount()).toBe(0);
  });
});

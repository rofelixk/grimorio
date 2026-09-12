import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockCardEntryWithoutId } from '../../core/testing/card.mocks';
import { CardService } from '../../core/services/card.service';
import { DeckService } from '../../core/services/deck.service';
import { DeckCard } from '../../core/models/deck.model';
import { DeckDetail } from './deck-detail';

describe('DeckDetail', () => {
  let component: DeckDetail;
  let fixture: ComponentFixture<DeckDetail>;
  let deckService: DeckService;
  let cardService: CardService;
  let deckId: string;

  const commanderEntry = () =>
    mockCardEntryWithoutId({
      name: 'Prime Speaker Vannifar',
      canBeCommander: true,
      commanderLegality: 'legal',
      colorIdentity: ['U', 'G'],
    });

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DeckDetail],
      providers: [provideRouter([])],
    }).compileComponents();

    cardService = TestBed.inject(CardService);
    deckService = TestBed.inject(DeckService);
    const deck = deckService.add({ name: 'Simic Value', commander: null, cards: [] });
    deckId = deck.id;

    fixture = TestBed.createComponent(DeckDetail);
    fixture.componentRef.setInput('id', deckId);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reports no legality data until the deck exists', () => {
    fixture.componentRef.setInput('id', 'missing');
    expect(component.deck()).toBeUndefined();
  });

  it('is not legal with no commander and no cards', () => {
    expect(component.legality()?.isLegal).toBe(false);
    expect(component.legality()?.totalCount).toBe(0);
  });

  it('flags a color-identity violation once a commander is set', () => {
    const commander = cardService.add(commanderEntry());
    deckService.setCommander(deckId, { id: commander.id, source: 'owned', cardEntryId: commander.id });

    const redCard = cardService.add(mockCardEntryWithoutId({ name: 'Lightning Bolt', colorIdentity: ['R'] }));
    deckService.addCard(deckId, { id: redCard.id, source: 'owned', cardEntryId: redCard.id });

    expect(component.legality()?.colorIdentityViolations).toEqual(['Lightning Bolt']);
    expect(component.legality()?.isLegal).toBe(false);
  });

  it('flags a singleton violation for duplicate non-basic-land names', () => {
    const commander = cardService.add(commanderEntry());
    deckService.setCommander(deckId, { id: commander.id, source: 'owned', cardEntryId: commander.id });

    const dupe = mockCardEntryWithoutId({ name: 'Sol Ring', colorIdentity: [] });
    const first = cardService.add(dupe);
    const second = cardService.add(dupe);
    deckService.addCard(deckId, { id: first.id, source: 'owned', cardEntryId: first.id });
    deckService.addCard(deckId, { id: second.id, source: 'owned', cardEntryId: second.id });

    expect(component.legality()?.singletonViolations).toEqual(['Sol Ring']);
  });

  it('does not flag duplicate basic lands as singleton violations', () => {
    const commander = cardService.add(commanderEntry());
    deckService.setCommander(deckId, { id: commander.id, source: 'owned', cardEntryId: commander.id });

    const forest = mockCardEntryWithoutId({ name: 'Forest', colorIdentity: [] });
    const first = cardService.add(forest);
    const second = cardService.add(forest);
    deckService.addCard(deckId, { id: first.id, source: 'owned', cardEntryId: first.id });
    deckService.addCard(deckId, { id: second.id, source: 'owned', cardEntryId: second.id });

    expect(component.legality()?.singletonViolations).toEqual([]);
  });

  it('flags a commander that is not eligible', () => {
    const commander = cardService.add(
      mockCardEntryWithoutId({ name: 'Not A Commander', canBeCommander: false, commanderLegality: 'legal' }),
    );
    deckService.setCommander(deckId, { id: commander.id, source: 'owned', cardEntryId: commander.id });

    expect(component.legality()?.commanderEligible).toBe(false);
    expect(component.legality()?.isLegal).toBe(false);
  });

  it('is legal once every check passes and the count reaches 100', () => {
    const commander = cardService.add(commanderEntry());
    deckService.setCommander(deckId, { id: commander.id, source: 'owned', cardEntryId: commander.id });

    const cards: DeckCard[] = [];
    for (let i = 0; i < 99; i += 1) {
      const entry = cardService.add(mockCardEntryWithoutId({ name: `Card ${i}`, colorIdentity: ['U'] }));
      cards.push({ id: entry.id, source: 'owned', cardEntryId: entry.id });
    }
    for (const card of cards) {
      deckService.addCard(deckId, card);
    }

    const legality = component.legality();
    expect(legality?.totalCount).toBe(100);
    expect(legality?.isLegal).toBe(true);
  });

  it('isAddable rejects a card already in the deck by name (not a basic land)', () => {
    const commander = cardService.add(commanderEntry());
    deckService.setCommander(deckId, { id: commander.id, source: 'owned', cardEntryId: commander.id });

    const sameName = mockCardEntryWithoutId({ name: 'Sol Ring', colorIdentity: [] });
    const existing = cardService.add(sameName);
    deckService.addCard(deckId, { id: existing.id, source: 'owned', cardEntryId: existing.id });

    expect(component.isAddable(sameName)).toBe(false);
  });

  it('isAddable allows a second basic land with the same name', () => {
    const commander = cardService.add(commanderEntry());
    deckService.setCommander(deckId, { id: commander.id, source: 'owned', cardEntryId: commander.id });

    const forest = mockCardEntryWithoutId({ name: 'Forest', colorIdentity: [] });
    const existing = cardService.add(forest);
    deckService.addCard(deckId, { id: existing.id, source: 'owned', cardEntryId: existing.id });

    expect(component.isAddable(forest)).toBe(true);
  });
});

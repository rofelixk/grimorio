import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockCardEntryWithoutId } from '../../core/testing/card.mocks';
import { CardService } from '../../core/services/card.service';
import { DeckCard } from '../../core/models/deck.model';
import { DeckCardList } from './deck-card-list';

describe('DeckCardList', () => {
  let component: DeckCardList;
  let fixture: ComponentFixture<DeckCardList>;
  let cardService: CardService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DeckCardList],
    }).compileComponents();

    cardService = TestBed.inject(CardService);
    fixture = TestBed.createComponent(DeckCardList);
    component = fixture.componentInstance;
  });

  it('resolves an owned slot to the live CardEntry and marks it owned', () => {
    const entry = cardService.add(mockCardEntryWithoutId({ name: 'Sol Ring' }));
    const cards: DeckCard[] = [{ id: entry.id, source: 'owned', cardEntryId: entry.id }];
    fixture.componentRef.setInput('cards', cards);

    expect(component.rows()).toEqual([{ id: entry.id, identity: entry, status: 'owned' }]);
  });

  it('marks a dangling owned reference as removed', () => {
    const cards: DeckCard[] = [{ id: 'gone', source: 'owned', cardEntryId: 'gone' }];
    fixture.componentRef.setInput('cards', cards);

    expect(component.rows()).toEqual([{ id: 'gone', identity: undefined, status: 'removed' }]);
  });

  it('marks a free-build card as not-owned when no matching printing is in the collection', () => {
    const identity = mockCardEntryWithoutId();
    const cards: DeckCard[] = [{ id: 'slot-1', source: 'freeBuild', card: identity }];
    fixture.componentRef.setInput('cards', cards);

    expect(component.rows()[0].status).toBe('not-owned');
  });

  it('marks a free-build card as owned when a matching printing (by scryfallId) exists', () => {
    const owned = mockCardEntryWithoutId();
    cardService.add(owned);
    const cards: DeckCard[] = [{ id: 'slot-1', source: 'freeBuild', card: owned }];
    fixture.componentRef.setInput('cards', cards);

    expect(component.rows()[0].status).toBe('owned');
  });

  it('emits remove with the deck card id', () => {
    fixture.componentRef.setInput('cards', []);
    let emitted: string | undefined;
    component.remove.subscribe((id) => (emitted = id));

    component.removeCard('slot-1');

    expect(emitted).toBe('slot-1');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockCardEntryWithoutId } from '../../core/testing/card.mocks';
import { CardService } from '../../core/services/card.service';
import { CardPicker } from './card-picker';
import { DeckCard } from '../../core/models/deck.model';

describe('CardPicker', () => {
  let component: CardPicker;
  let fixture: ComponentFixture<CardPicker>;
  let cardService: CardService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CardPicker],
    }).compileComponents();

    cardService = TestBed.inject(CardService);
    fixture = TestBed.createComponent(CardPicker);
    fixture.componentRef.setInput('filter', () => true);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists owned cards passing the filter, matching the search text', () => {
    cardService.add(mockCardEntryWithoutId({ name: 'Lightning Bolt' }));
    cardService.add(mockCardEntryWithoutId({ name: 'Sol Ring' }));

    component.search.set('bolt');

    expect(component.matchingOwnedCards().length).toBe(1);
    expect(component.matchingOwnedCards()[0].name).toBe('Lightning Bolt');
  });

  it('excludes owned cards that fail the filter', () => {
    fixture.componentRef.setInput('filter', (c: { name: string }) => c.name !== 'Sol Ring');
    cardService.add(mockCardEntryWithoutId({ name: 'Sol Ring' }));

    expect(component.matchingOwnedCards()).toEqual([]);
  });

  it('emits an owned pick', () => {
    const added = cardService.add(mockCardEntryWithoutId());

    let picked: DeckCard | undefined;
    component.picked.subscribe((event) => (picked = event));
    component.pickOwned(added.id);

    expect(picked).toEqual({ id: added.id, source: 'owned', cardEntryId: added.id });
  });

  it('gates the free-build add button until a generated card passes the filter', async () => {
    fixture.componentRef.setInput('filter', () => false);
    component.setCode.set('mh3');
    component.collectorNumber.set('161');
    await component.generate();

    expect(component.generatedPassesFilter()).toBe(false);

    let picked: DeckCard | undefined;
    component.picked.subscribe((event) => (picked = event));
    component.pickFreeBuild();

    expect(picked).toBeUndefined();
  });

  it('emits a free-build pick once the generated card passes the filter', async () => {
    fixture.componentRef.setInput('filter', () => true);
    component.setCode.set('mh3');
    component.collectorNumber.set('161');
    await component.generate();

    let picked: DeckCard | undefined;
    component.picked.subscribe((event) => (picked = event));
    component.pickFreeBuild();

    expect(picked?.source).toBe('freeBuild');
    expect(component.generated()).toBeNull();
  });
});

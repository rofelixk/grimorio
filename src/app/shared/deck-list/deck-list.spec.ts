import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { DeckService } from '../../core/services/deck.service';
import { DeckList } from './deck-list';

describe('DeckList', () => {
  let component: DeckList;
  let fixture: ComponentFixture<DeckList>;
  let deckService: DeckService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DeckList],
      providers: [provideRouter([])],
    }).compileComponents();

    deckService = TestBed.inject(DeckService);
    fixture = TestBed.createComponent(DeckList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('adds a deck with no commander and no cards', () => {
    component.addDeck('Atraxa Superfriends');

    expect(component.decks().length).toBe(1);
    expect(component.decks()[0]).toMatchObject({ name: 'Atraxa Superfriends', commander: null, cards: [] });
  });

  it('removes a deck', () => {
    const deck = deckService.add({ name: 'Atraxa Superfriends', commander: null, cards: [] });

    component.removeDeck(deck.id);

    expect(component.decks()).toEqual([]);
  });
});

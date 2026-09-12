import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockCardEntry } from '../../core/testing/card.mocks';
import { CardList } from './card-list';

describe('CardList', () => {
  let component: CardList;
  let fixture: ComponentFixture<CardList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardList],
    }).compileComponents();

    fixture = TestBed.createComponent(CardList);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('cards', []);
    expect(component).toBeTruthy();
  });

  it('emits remove with the card id', () => {
    const card = mockCardEntry();
    fixture.componentRef.setInput('cards', [card]);

    let emittedId: string | undefined;
    component.remove.subscribe((id) => (emittedId = id));
    component.removeCard(card.id);

    expect(emittedId).toBe(card.id);
  });
});

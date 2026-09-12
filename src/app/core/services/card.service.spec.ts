import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CardEntry } from '../models/card.model';
import { mockCardEntry } from '../testing/card.mocks';
import { CardService } from './card.service';

function cardWithoutId(): Omit<CardEntry, 'id'> {
  const { id, ...rest } = mockCardEntry();
  void id;
  return rest;
}

const baseCard = cardWithoutId();

describe('CardService', () => {
  let service: CardService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CardService);
  });

  it('starts empty when nothing is persisted', () => {
    expect(service.cards()).toEqual([]);
  });

  it('adds a card and persists it to localStorage', () => {
    const added = service.add(baseCard);

    expect(service.cards()).toEqual([added]);
    const raw = localStorage.getItem('grimorio.cards');
    expect(JSON.parse(raw!)).toEqual([added]);
  });

  it('updates a card in place', () => {
    const added = service.add(baseCard);

    service.update(added.id, { quantity: 4, forSale: true });

    expect(service.cards()[0]).toEqual({ ...added, quantity: 4, forSale: true });
  });

  it('removes a card', () => {
    const added = service.add(baseCard);

    service.remove(added.id);

    expect(service.cards()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('grimorio.cards')!)).toEqual([]);
  });

  it('finds a card by id', () => {
    const added = service.add(baseCard);

    expect(service.byId(added.id)()).toEqual(added);
    expect(service.byId('missing')()).toBeUndefined();
  });

  it('reloads persisted cards on a fresh service instance', () => {
    service.add(baseCard);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(CardService);

    expect(reloaded.cards().length).toBe(1);
  });
});

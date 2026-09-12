import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CardEntry } from '../models/card.model';
import { CardService } from './card.service';

const baseCard: Omit<CardEntry, 'id'> = {
  scryfallId: '909a52bc-53f6-4654-9db7-e8f48333d765',
  oracleId: '25877c41-39a4-4cc3-ac4b-8f3dd06d579b',
  name: 'Lightning Bolt',
  setCode: 'LEA',
  setName: 'Limited Edition Alpha',
  collectorNumber: '161',
  rarity: 'common',
  commanderLegality: 'legal',
  finish: 'nonfoil',
  language: 'en',
  condition: 'NM',
  quantity: 1,
  locationId: 'loc-1',
  forSale: false,
  imageUrl: 'https://cards.scryfall.io/normal/front/9/0/909a52bc-53f6-4654-9db7-e8f48333d765.jpg',
};

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

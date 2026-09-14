import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardLookupService } from '../../core/services/card-lookup.service';
import { mockCardLookupResult } from '../../core/testing/card.mocks';
import { AddCardForm } from './add-card-form';

describe('AddCardForm', () => {
  let component: AddCardForm;
  let fixture: ComponentFixture<AddCardForm>;
  let cardLookup: Pick<CardLookupService, 'lookup'>;

  beforeEach(async () => {
    cardLookup = { lookup: vi.fn().mockResolvedValue(mockCardLookupResult()) };

    await TestBed.configureTestingModule({
      imports: [AddCardForm],
      providers: [{ provide: CardLookupService, useValue: cardLookup }],
    }).compileComponents();

    fixture = TestBed.createComponent(AddCardForm);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('requires a set code and collector number before generating', async () => {
    await component.generate();

    expect(component.lookupError()).toBe('Enter a set code and collector number first.');
    expect(component.generated()).toBeNull();
  });

  it('does not emit cardAdded before a generate step has completed', () => {
    let emitted = false;
    component.cardAdded.subscribe(() => (emitted = true));

    component.submit();

    expect(emitted).toBe(false);
  });

  it('emits cardAdded with defaults applied once generated', async () => {
    component.setCode.set('mh3');
    component.collectorNumber.set('161');
    await component.generate();

    let emitted: unknown;
    component.cardAdded.subscribe((event) => (emitted = event));
    component.submit();

    expect(emitted).toMatchObject({
      setCode: 'MH3',
      collectorNumber: '161',
      finish: 'nonfoil',
      language: 'en',
      condition: 'NM',
      quantity: 1,
      forSale: false,
      notes: undefined,
    });
    expect(component.generated()).toBeNull();
    expect(component.setCode()).toBe('');
  });

  it('surfaces a lookup error and lets the form be retried', async () => {
    vi.mocked(cardLookup.lookup).mockRejectedValueOnce(new Error('network down'));

    component.setCode.set('mh3');
    component.collectorNumber.set('161');
    await component.generate();

    expect(component.lookupError()).toBe('network down');
    expect(component.generating()).toBe(false);
  });
});

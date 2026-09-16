import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeckCardIdentity } from '@models/deck.model';
import { CardOcrService } from '@services/card-ocr.service';
import { CardService } from '@services/card.service';
import { CardLookupResult, CardLookupService } from '@services/card-lookup.service';
import { DeckService } from '@services/deck.service';
import { mockCardLookupResult } from '@testing/card.mocks';
import { AddCardModal } from './add-card-modal';

describe('AddCardModal', () => {
  let component: AddCardModal;
  let fixture: ComponentFixture<AddCardModal>;
  let cardLookup: Pick<CardLookupService, 'lookup' | 'searchByName'>;
  let cardService: Pick<CardService, 'add'>;
  let deckService: Pick<DeckService, 'addCard'>;
  let cardOcr: Pick<CardOcrService, 'run'>;

  beforeEach(async () => {
    cardLookup = {
      lookup: vi.fn().mockResolvedValue(mockCardLookupResult()),
      searchByName: vi.fn().mockResolvedValue([mockCardLookupResult()]),
    };
    cardService = { add: vi.fn() };
    deckService = { addCard: vi.fn() };
    cardOcr = { run: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AddCardModal],
      providers: [
        { provide: CardLookupService, useValue: cardLookup },
        { provide: CardService, useValue: cardService },
        { provide: DeckService, useValue: deckService },
        { provide: CardOcrService, useValue: cardOcr },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddCardModal);
    fixture.componentRef.setInput('context', 'collection');
    fixture.componentRef.setInput('locationId', 'loc-1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('runs a name search and stores the results', async () => {
    component.nameQuery.set('Sol Ring');
    await component.runSearch();

    expect(cardLookup.searchByName).toHaveBeenCalledWith('Sol Ring');
    expect(component.results().length).toBe(1);
    expect(component.hasSearched()).toBe(true);
  });

  it('auto-picks a single unambiguous name search result', async () => {
    component.nameQuery.set('Sol Ring');
    await component.runSearch();

    expect(component.selected()).toEqual(component.results()[0]);
  });

  it('does not auto-pick when a name search returns multiple results', async () => {
    vi.mocked(cardLookup.searchByName).mockResolvedValueOnce([
      mockCardLookupResult({ name: 'Sol Ring' }),
      mockCardLookupResult({ name: 'Sol Ring (Alt)' }),
    ]);
    component.nameQuery.set('Sol Ring');
    await component.runSearch();

    expect(component.results().length).toBe(2);
    expect(component.selected()).toBeNull();
  });

  it('does not auto-pick a single raw result that the deck filter rejects', async () => {
    fixture.componentRef.setInput('context', 'deck');
    fixture.componentRef.setInput('deckId', 'deck-1');
    fixture.componentRef.setInput('filter', () => false);

    component.nameQuery.set('Sol Ring');
    await component.runSearch();

    expect(component.results().length).toBe(1);
    expect(component.selected()).toBeNull();
  });

  it('runs a set+collector search and wraps the single result in a list', async () => {
    component.setSearchMode('setCode');
    component.setCodeInput.set('mh3');
    component.collectorNumberInput.set('161');
    await component.runSearch();

    expect(cardLookup.lookup).toHaveBeenCalledWith('mh3', '161');
    expect(component.results().length).toBe(1);
    expect(component.selected()).toEqual(component.results()[0]);
  });

  it('treats a "not found" lookup error as an empty result without a banner', async () => {
    vi.mocked(cardLookup.lookup).mockRejectedValueOnce(
      new Error('Nenhuma carta encontrada para MH3 #999.'),
    );
    component.setSearchMode('setCode');
    component.setCodeInput.set('mh3');
    component.collectorNumberInput.set('999');
    await component.runSearch();

    expect(component.results()).toEqual([]);
    expect(component.searchError()).toBeNull();
  });

  it('surfaces a connectivity error as a banner', async () => {
    vi.mocked(cardLookup.searchByName).mockRejectedValueOnce(new Error('network down'));
    component.nameQuery.set('Sol Ring');
    await component.runSearch();

    expect(component.searchError()).toBe('network down');
  });

  it('skips a repeat search for the exact same query', async () => {
    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    await component.runSearch();

    expect(cardLookup.searchByName).toHaveBeenCalledTimes(1);
  });

  it('runs the search again once the query actually changes', async () => {
    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    component.nameQuery.set('Lightning Bolt');
    await component.runSearch();

    expect(cardLookup.searchByName).toHaveBeenCalledTimes(2);
    expect(cardLookup.searchByName).toHaveBeenNthCalledWith(2, 'Lightning Bolt');
  });

  it('does not dedupe across search modes even with matching text', async () => {
    component.setSearchMode('setCode');
    component.setCodeInput.set('MH3');
    component.collectorNumberInput.set('161');
    await component.runSearch();

    component.setSearchMode('name');
    component.nameQuery.set('MH3');
    await component.runSearch();

    expect(cardLookup.lookup).toHaveBeenCalledTimes(1);
    expect(cardLookup.searchByName).toHaveBeenCalledTimes(1);
  });

  it('allows retrying the identical query after a failed search', async () => {
    vi.mocked(cardLookup.searchByName).mockRejectedValueOnce(new Error('network down'));
    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    await component.runSearch();

    expect(cardLookup.searchByName).toHaveBeenCalledTimes(2);
  });

  it('filters results by the deck color-identity predicate in deck context', async () => {
    fixture.componentRef.setInput('context', 'deck');
    fixture.componentRef.setInput('deckId', 'deck-1');
    fixture.componentRef.setInput('filter', (c: DeckCardIdentity) => c.colorIdentity.includes('R'));
    vi.mocked(cardLookup.searchByName).mockResolvedValueOnce([
      mockCardLookupResult({ name: 'Lightning Bolt', colorIdentity: ['R'] }),
      mockCardLookupResult({ name: 'Sol Ring', colorIdentity: [] }),
    ]);

    component.nameQuery.set('a');
    await component.runSearch();

    expect(component.filteredResults().map((r: CardLookupResult) => r.name)).toEqual([
      'Lightning Bolt',
    ]);
  });

  it('preserves search state when a result is picked, then backed out of', async () => {
    component.nameQuery.set('Sol Ring');
    await component.runSearch();

    component.pickResult(component.results()[0]);
    expect(component.selected()).not.toBeNull();

    component.back();
    expect(component.selected()).toBeNull();
    expect(component.nameQuery()).toBe('Sol Ring');
    expect(component.results().length).toBe(1);
  });

  it('submits a collection add and resets/closes afterward', async () => {
    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    component.pickResult(component.results()[0]);
    component.quantity.set('2');

    let closed = false;
    component.closed.subscribe(() => (closed = true));
    component.submit();

    expect(cardService.add).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: 'loc-1', quantity: 2, finish: 'nonfoil' }),
    );
    expect(closed).toBe(true);
    expect(component.selected()).toBeNull();
    expect(component.nameQuery()).toBe('');
  });

  it('submits a deck add as a freeBuild DeckCard', async () => {
    fixture.componentRef.setInput('context', 'deck');
    fixture.componentRef.setInput('deckId', 'deck-1');
    fixture.componentRef.setInput('filter', () => true);

    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    component.pickResult(component.results()[0]);
    component.submit();

    expect(deckService.addCard).toHaveBeenCalledWith(
      'deck-1',
      expect.objectContaining({ source: 'freeBuild' }),
    );
  });

  it('does not submit a deck add that fails the filter (defense in depth)', async () => {
    fixture.componentRef.setInput('context', 'deck');
    fixture.componentRef.setInput('deckId', 'deck-1');
    fixture.componentRef.setInput('filter', () => false);

    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    component.pickResult(component.results()[0]);
    component.submit();

    expect(deckService.addCard).not.toHaveBeenCalled();
  });

  it('jumps straight to the confirm step when the camera reads both fields', async () => {
    vi.mocked(cardOcr.run).mockResolvedValueOnce({ setCode: 'MH3', collectorNumber: '161' });

    await component.onCameraCaptured(new Blob());

    expect(cardLookup.lookup).toHaveBeenCalledWith('MH3', '161');
    expect(component.selected()).not.toBeNull();
    expect(component.ocrHelperMessage()).toBeNull();
  });

  it('switches to Set+Código mode with a helper message when the camera reads only part of the card', async () => {
    vi.mocked(cardOcr.run).mockResolvedValueOnce({ setCode: 'MH3', collectorNumber: '' });

    await component.onCameraCaptured(new Blob());

    expect(component.searchMode()).toBe('setCode');
    expect(component.setCodeInput()).toBe('MH3');
    expect(component.selected()).toBeNull();
    expect(component.ocrHelperMessage()).toBe(
      'Não foi possível ler as informações completas, digite ou tire uma nova foto.',
    );
  });

  it('cancels and resets when the search dialog is dismissed natively without a pick', () => {
    component.nameQuery.set('Sol Ring');

    let closed = false;
    component.closed.subscribe(() => (closed = true));
    component.onSearchDialogNativeClose();

    expect(closed).toBe(true);
    expect(component.nameQuery()).toBe('');
  });

  it('treats a native close of the confirm dialog as Back when a card is selected', async () => {
    fixture.componentRef.setInput('open', true);
    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    component.pickResult(component.results()[0]);

    component.onConfirmDialogNativeClose();

    expect(component.selected()).toBeNull();
    expect(component.nameQuery()).toBe('Sol Ring');
  });

  it('submitAndContinue() inserts the card and returns to the search step with its state intact', async () => {
    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    component.pickResult(component.results()[0]);
    component.quantity.set('2');
    component.forSale.set(true);

    let closed = false;
    component.closed.subscribe(() => (closed = true));
    component.submitAndContinue();

    expect(cardService.add).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: 'loc-1', quantity: 2, finish: 'nonfoil' }),
    );
    expect(closed).toBe(false);
    expect(component.selected()).toBeNull();
    expect(component.forSale()).toBe(false);
    expect(component.quantity()).toBe('');
    expect(component.nameQuery()).toBe('Sol Ring');
    expect(component.results().length).toBe(1);
    expect(component.searchMode()).toBe('name');
    expect(component.hasSearched()).toBe(true);
  });

  it('submitAndContinue() still dedupes an identical repeat search afterward', async () => {
    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    component.pickResult(component.results()[0]);
    component.submitAndContinue();

    await component.runSearch();

    expect(cardLookup.searchByName).toHaveBeenCalledTimes(1);
  });

  it('submitAndContinue() inserts a deck add as a freeBuild DeckCard', async () => {
    fixture.componentRef.setInput('context', 'deck');
    fixture.componentRef.setInput('deckId', 'deck-1');
    fixture.componentRef.setInput('filter', () => true);

    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    component.pickResult(component.results()[0]);
    component.submitAndContinue();

    expect(deckService.addCard).toHaveBeenCalledWith(
      'deck-1',
      expect.objectContaining({ source: 'freeBuild' }),
    );
    expect(component.selected()).toBeNull();
  });

  it('does not submitAndContinue() a deck add that fails the filter (defense in depth)', async () => {
    fixture.componentRef.setInput('context', 'deck');
    fixture.componentRef.setInput('deckId', 'deck-1');
    fixture.componentRef.setInput('filter', () => false);

    component.nameQuery.set('Sol Ring');
    await component.runSearch();
    component.pickResult(component.results()[0]);
    component.submitAndContinue();

    expect(deckService.addCard).not.toHaveBeenCalled();
    expect(component.selected()).not.toBeNull();
  });
});

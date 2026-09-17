import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { CardEntry } from '@models/card.model';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { CollectionDetail } from './collection-detail';

function cardPayload(overrides: Partial<CardEntry> = {}): Omit<CardEntry, 'id'> {
  return {
    scryfallId: 'sf-1',
    oracleId: 'o-1',
    name: 'Sol Ring',
    setCode: 'CMD',
    setName: 'Commander',
    collectorNumber: '1',
    rarity: 'uncommon',
    commanderLegality: 'legal',
    colorIdentity: [],
    typeLine: 'Artifact',
    canBeCommander: false,
    finish: 'nonfoil',
    language: 'en',
    condition: 'NM',
    quantity: 1,
    locationId: '',
    forSale: false,
    imageUrl: '',
    ...overrides,
  };
}

describe('CollectionDetail', () => {
  let component: CollectionDetail;
  let fixture: ComponentFixture<CollectionDetail>;
  let locationsService: StorageLocationService;
  let cardService: CardService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CollectionDetail],
      providers: [provideRouter([])],
    }).compileComponents();

    locationsService = TestBed.inject(StorageLocationService);
    cardService = TestBed.inject(CardService);
    const location = locationsService.add({ name: 'Box 1', parentId: null });

    fixture = TestBed.createComponent(CollectionDetail);
    fixture.componentRef.setInput('id', location.id);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resolves the location by id', () => {
    expect(component.location()?.name).toBe('Box 1');
  });

  it('filters cards to only this location', () => {
    expect(component.cardsHere()).toEqual([]);
  });

  it('opens the add-card modal when the trigger button is clicked', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.showAddModal()).toBe(false);

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    const button = buttons.find((b) => b.textContent?.trim() === 'Adicionar carta');
    button?.click();

    expect(component.showAddModal()).toBe(true);
  });

  it('computes stats for a location with cards of different quantities', () => {
    cardService.add(cardPayload({ locationId: component.id(), quantity: 2 }));
    cardService.add(
      cardPayload({ locationId: component.id(), quantity: 1, name: 'Arcane Signet' }),
    );

    expect(component.stats().total).toBe(3);
    expect(component.stats().unique).toBe(2);
  });

  it("includes a grandchild's cards in a child plate's count via descendantIds", () => {
    const child = locationsService.add({ name: 'Divider A', parentId: component.id() });
    const grandchild = locationsService.add({ name: 'Sleeve 1', parentId: child.id });
    cardService.add(cardPayload({ locationId: grandchild.id, quantity: 4 }));

    const descendantIds = locationsService.descendantIds(child.id)();
    expect(descendantIds).toContain(grandchild.id);
  });

  it('filter computed matches accent- and case-insensitively, empty for no match', () => {
    cardService.add(cardPayload({ locationId: component.id(), name: 'Ação Relâmpago' }));

    component.setFilterQuery('acao relampago');
    expect(component.filteredCards().length).toBe(1);

    component.setFilterQuery('nonexistent card');
    expect(component.filteredCards()).toEqual([]);
  });

  it('view mode round-trips through localStorage', () => {
    expect(component.viewMode()).toBe('grid');

    component.setViewMode('list');
    expect(component.viewMode()).toBe('list');
    expect(localStorage.getItem('grimorio.collectionDetail.viewMode')).toBe('list');
  });
});

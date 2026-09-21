import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardEntry } from '@models/card.model';
import { CardFilterService } from '@services/card-filter.service';
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
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function fakeActivatedRoute(queryParams: Record<string, string> = {}): ActivatedRoute {
  return {
    snapshot: { queryParamMap: convertToParamMap(queryParams) },
  } as ActivatedRoute;
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

  it('filteredByFilters narrows filteredCards when a CardFilterService field is set', () => {
    cardService.add(cardPayload({ locationId: component.id(), forSale: true, name: 'For Sale' }));
    cardService.add(
      cardPayload({ locationId: component.id(), forSale: false, name: 'Not For Sale' }),
    );

    expect(component.filteredByFilters().length).toBe(2);

    const filterService = TestBed.inject(CardFilterService);
    filterService.setField('forSale', true);

    expect(component.filteredByFilters().length).toBe(1);
    expect(component.filteredByFilters()[0].name).toBe('For Sale');
    expect(component.visibleCards().length).toBe(1);
  });

  it('resultLabel reflects no-filter and filters-active states', () => {
    cardService.add(cardPayload({ locationId: component.id(), forSale: true, name: 'A' }));
    cardService.add(cardPayload({ locationId: component.id(), forSale: false, name: 'B' }));

    expect(component.resultLabel()).toBe('2 cartas');

    TestBed.inject(CardFilterService).setField('forSale', true);

    expect(component.resultLabel()).toBe('1 de 2 cartas');
  });

  it('resets CardFilterService on destroy', () => {
    const filterService = TestBed.inject(CardFilterService);
    filterService.setField('forSale', true);
    filterService.panelOpen.set(true);

    fixture.destroy();

    expect(filterService.isActive()).toBe(false);
    expect(filterService.panelOpen()).toBe(false);
  });
});

describe('CollectionDetail query param hydration', () => {
  let filterService: CardFilterService;

  async function createWithQueryParams(queryParams: Record<string, string>): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CollectionDetail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: fakeActivatedRoute(queryParams) },
      ],
    }).compileComponents();

    const locationsService = TestBed.inject(StorageLocationService);
    filterService = TestBed.inject(CardFilterService);
    const location = locationsService.add({ name: 'Box 1', parentId: null });

    const fixture = TestBed.createComponent(CollectionDetail);
    fixture.componentRef.setInput('id', location.id);
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates filters from route query params on init and opens the panel', async () => {
    await createWithQueryParams({
      cor: 'UB',
      match: 'exata',
      venda: '1',
      raridade: 'rare',
      acabamento: 'foil',
      condicao: 'NM',
      set: 'CMD',
      tipo: 'creature',
    });

    expect(filterService.filters().colors).toEqual(['U', 'B']);
    expect(filterService.filters().colorMatch).toBe('exact');
    expect(filterService.filters().forSale).toBe(true);
    expect(filterService.filters().rarity).toBe('rare');
    expect(filterService.filters().finish).toBe('foil');
    expect(filterService.filters().condition).toBe('NM');
    expect(filterService.filters().setCode).toBe('CMD');
    expect(filterService.filters().type).toBe('creature');
    expect(filterService.panelOpen()).toBe(true);
  });

  it('parses a colorless "C" letter in cor into the colorless field', async () => {
    await createWithQueryParams({ cor: 'C' });

    expect(filterService.filters().colorless).toBe(true);
    expect(filterService.panelOpen()).toBe(true);
  });

  it('leaves filters at defaults and the panel closed when no query params are present', async () => {
    await createWithQueryParams({});

    expect(filterService.isActive()).toBe(false);
    expect(filterService.panelOpen()).toBe(false);
  });
});

describe('CollectionDetail query param write', () => {
  let filterService: CardFilterService;
  let navigateSpy: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<CollectionDetail>;

  async function createWithNavigateSpy(queryParams: Record<string, string> = {}): Promise<void> {
    navigateSpy = vi.fn();
    await TestBed.configureTestingModule({
      imports: [CollectionDetail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: fakeActivatedRoute(queryParams) },
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    }).compileComponents();

    const locationsService = TestBed.inject(StorageLocationService);
    filterService = TestBed.inject(CardFilterService);
    const location = locationsService.add({ name: 'Box 1', parentId: null });

    fixture = TestBed.createComponent(CollectionDetail);
    fixture.componentRef.setInput('id', location.id);
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
  });

  const allNullParams = {
    cor: null,
    match: null,
    venda: null,
    raridade: null,
    acabamento: null,
    condicao: null,
    set: null,
    tipo: null,
  };

  it('writes all-null query params on init when filters are at defaults', async () => {
    await createWithNavigateSpy();

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: allNullParams,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });

  it('setting a filter field calls navigate with the correct merged query params', async () => {
    await createWithNavigateSpy();
    navigateSpy.mockClear();

    filterService.setField('rarity', 'rare');
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { ...allNullParams, raridade: 'rare' },
      }),
    );
  });

  it('clearing a filter field back to default passes null for that key', async () => {
    await createWithNavigateSpy();
    filterService.setField('rarity', 'rare');
    await fixture.whenStable();
    navigateSpy.mockClear();

    filterService.setField('rarity', '');
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: allNullParams,
      }),
    );
  });

  it('serializes multiple color selections into the stable WUBRG + C order', async () => {
    await createWithNavigateSpy();
    navigateSpy.mockClear();

    filterService.toggleColor('G');
    await fixture.whenStable();
    filterService.toggleColor('W');
    await fixture.whenStable();
    filterService.toggleColor('B');
    await fixture.whenStable();
    filterService.setField('colorless', true);
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: { ...allNullParams, cor: 'WBGC' },
      }),
    );
  });

  it('toggling colorMatch to exact adds match=exata; back to any removes it', async () => {
    await createWithNavigateSpy();
    navigateSpy.mockClear();

    filterService.setField('colorMatch', 'exact');
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { ...allNullParams, match: 'exata' },
      }),
    );

    navigateSpy.mockClear();
    filterService.setField('colorMatch', 'any');
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: allNullParams,
      }),
    );
  });

  it('does not produce duplicate navigate calls for a sequence of distinct filter changes', async () => {
    await createWithNavigateSpy();
    navigateSpy.mockClear();

    filterService.setField('forSale', true);
    await fixture.whenStable();
    filterService.setField('rarity', 'mythic');
    await fixture.whenStable();
    filterService.toggleColor('U');
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledTimes(3);
  });
});

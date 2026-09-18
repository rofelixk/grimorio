import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CardEntry } from '@models/card.model';
import { StorageLocationNode } from '@models/storage-location.model';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { LocationPlate } from './location-plate';

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

@Component({ template: '', selector: 'app-test-blank' })
class BlankComponent {}

function nodeFor(id: string, name: string, children: StorageLocationNode[] = []): StorageLocationNode {
  return { id, name, parentId: null, children, updatedAt: '2026-01-01T00:00:00.000Z' };
}

describe('LocationPlate', () => {
  let fixture: ComponentFixture<LocationPlate>;
  let locationsService: StorageLocationService;
  let cardService: CardService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LocationPlate],
      providers: [provideRouter([{ path: 'collection/:id', component: BlankComponent }])],
    }).compileComponents();

    locationsService = TestBed.inject(StorageLocationService);
    cardService = TestBed.inject(CardService);
    router = TestBed.inject(Router);
  });

  function render(node: StorageLocationNode): void {
    fixture = TestBed.createComponent(LocationPlate);
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();
  }

  it('shows the total card count across the location and its sublocations', () => {
    const loc = locationsService.add({ name: 'Caixa Commander', parentId: null });
    const sub = locationsService.add({ name: 'Divisória A', parentId: loc.id });
    cardService.add(cardPayload({ locationId: loc.id, quantity: 2 }));
    cardService.add(cardPayload({ locationId: sub.id, quantity: 3 }));

    render(nodeFor(loc.id, loc.name, [nodeFor(sub.id, sub.name)]));

    expect(fixture.componentInstance.totalCards()).toBe(5);
  });

  it('shows "Sem sublocais" when there are no children', () => {
    const loc = locationsService.add({ name: 'Deckbox Azul', parentId: null });
    render(nodeFor(loc.id, loc.name));

    expect(fixture.componentInstance.chips().shown).toEqual([]);
    expect(fixture.componentInstance.chips().overflowLabel).toBe('Sem sublocais');
  });

  it('shows up to 3 chips with no overflow label', () => {
    const loc = locationsService.add({ name: 'Fichário Raros', parentId: null });
    const children = ['Página 1', 'Página 2', 'Página 3'].map(
      (name) => locationsService.add({ name, parentId: loc.id }),
    );

    render(nodeFor(loc.id, loc.name, children.map((c) => nodeFor(c.id, c.name))));

    expect(fixture.componentInstance.chips().shown.length).toBe(3);
    expect(fixture.componentInstance.chips().overflowLabel).toBeNull();
  });

  it('caps chips at 3 and pluralizes the overflow label for the rest', () => {
    const loc = locationsService.add({ name: 'Caixa de Bulk', parentId: null });
    const children = ['Terrenos', 'Comuns', 'Incomuns', 'Tokens'].map(
      (name) => locationsService.add({ name, parentId: loc.id }),
    );

    render(nodeFor(loc.id, loc.name, children.map((c) => nodeFor(c.id, c.name))));

    expect(fixture.componentInstance.chips().shown.length).toBe(3);
    expect(fixture.componentInstance.chips().overflowLabel).toBe('+1 sublocal');
  });

  it('navigates to the location when the row is clicked', () => {
    const loc = locationsService.add({ name: 'Estojo de Viagem', parentId: null });
    render(nodeFor(loc.id, loc.name));
    const navigate = vi.spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.plate').click();

    expect(navigate).toHaveBeenCalledWith(['/collection', loc.id]);
  });

  it('navigates to the location on Enter and prevents scrolling on Space', () => {
    const loc = locationsService.add({ name: 'Estojo de Viagem', parentId: null });
    render(nodeFor(loc.id, loc.name));
    const navigate = vi.spyOn(router, 'navigate');
    const plate: HTMLElement = fixture.nativeElement.querySelector('.plate');

    plate.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(navigate).toHaveBeenCalledWith(['/collection', loc.id]);

    navigate.mockClear();
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    plate.dispatchEvent(spaceEvent);
    expect(navigate).toHaveBeenCalledWith(['/collection', loc.id]);
    expect(spaceEvent.defaultPrevented).toBe(true);
  });

  it('does not navigate the row when a chip link is clicked', async () => {
    const loc = locationsService.add({ name: 'Caixa Commander', parentId: null });
    const sub = locationsService.add({ name: 'Divisória A', parentId: loc.id });
    render(nodeFor(loc.id, loc.name, [nodeFor(sub.id, sub.name)]));
    const navigate = vi.spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.chip').click();
    await fixture.whenStable();

    expect(navigate).not.toHaveBeenCalled();
  });
});

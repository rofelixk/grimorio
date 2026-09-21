import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CardEntry } from '@models/card.model';
import { CardService } from '@services/card.service';
import { CardFilterService, EMPTY_FILTERS } from '@services/card-filter.service';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { CollectionFilters } from './collection-filters';

describe('CollectionFilters', () => {
  let fixture: ComponentFixture<CollectionFilters>;
  let cardService: CardService;
  let filterService: CardFilterService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CollectionFilters],
    }).compileComponents();

    cardService = TestBed.inject(CardService);
    filterService = TestBed.inject(CardFilterService);
    filterService.filters.set(EMPTY_FILTERS);
    filterService.panelOpen.set(false);
    filterService.openMenu.set('');
  });

  function addCard(overrides: Partial<CardEntry> = {}): CardEntry {
    return cardService.add(mockCardEntryWithoutId({ locationId: 'loc-1', ...overrides }));
  }

  function render(): void {
    fixture = TestBed.createComponent(CollectionFilters);
    fixture.componentRef.setInput('locationId', 'loc-1');
    fixture.detectChanges();
  }

  it('renders collapsed by default', () => {
    render();
    const body: HTMLElement = fixture.nativeElement.querySelector('.filters-body');
    const head: HTMLElement = fixture.nativeElement.querySelector('.filters-head');

    expect(body.classList.contains('open')).toBe(false);
    expect(head.getAttribute('aria-expanded')).toBe('false');
    expect(head.textContent).toContain('Filtros (0)');
  });

  it('expand/collapse toggles panelOpen and applies inert to the collapsed body', () => {
    render();
    const head: HTMLElement = fixture.nativeElement.querySelector('.filters-head');
    const body: HTMLElement = fixture.nativeElement.querySelector('.filters-body');

    expect(body.hasAttribute('inert')).toBe(true);

    head.click();
    fixture.detectChanges();

    expect(filterService.panelOpen()).toBe(true);
    expect(body.classList.contains('open')).toBe(true);
    expect(body.hasAttribute('inert')).toBe(false);
    expect(head.getAttribute('aria-expanded')).toBe('true');

    head.click();
    fixture.detectChanges();

    expect(filterService.panelOpen()).toBe(false);
    expect(body.hasAttribute('inert')).toBe(true);
  });

  it('toggles a color pip and updates filterService.filters()', () => {
    addCard({ colorIdentity: ['R'] });
    render();
    filterService.panelOpen.set(true);
    fixture.detectChanges();

    const pip: HTMLElement = fixture.nativeElement.querySelector('.pip[title="Vermelho"]');
    pip.click();
    fixture.detectChanges();

    expect(filterService.filters().colors).toEqual(['R']);

    pip.click();
    fixture.detectChanges();

    expect(filterService.filters().colors).toEqual([]);
  });

  it('toggles the colorless pip', () => {
    render();
    filterService.panelOpen.set(true);
    fixture.detectChanges();

    const pip: HTMLElement = fixture.nativeElement.querySelector('.pip[title="Incolor"]');
    pip.click();
    fixture.detectChanges();

    expect(filterService.filters().colorless).toBe(true);
  });

  it('switches color match via the Qualquer/Exata toggle', () => {
    render();
    filterService.panelOpen.set(true);
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.view-toggle button'));
    const exact = buttons.find((b) => b.textContent?.trim() === 'Exata')!;
    exact.click();
    fixture.detectChanges();

    expect(filterService.filters().colorMatch).toBe('exact');
  });

  it('toggles the "Só à venda" button', () => {
    render();
    filterService.panelOpen.set(true);
    fixture.detectChanges();

    const toggle: HTMLElement = fixture.nativeElement.querySelector('.for-sale-toggle');
    toggle.click();
    fixture.detectChanges();

    expect(filterService.filters().forSale).toBe(true);
    expect(toggle.classList.contains('active')).toBe(true);
  });

  it('opening one dropdown closes the others', () => {
    render();
    filterService.panelOpen.set(true);
    fixture.detectChanges();

    fixture.componentInstance.toggleMenu('rarity');
    expect(filterService.openMenu()).toBe('rarity');

    fixture.componentInstance.toggleMenu('finish');
    expect(filterService.openMenu()).toBe('finish');

    // Toggling the already-open field closes it.
    fixture.componentInstance.toggleMenu('finish');
    expect(filterService.openMenu()).toBe('');
  });

  it('picking an option applies it via setField and closes the menu', () => {
    render();
    filterService.panelOpen.set(true);
    filterService.openMenu.set('finish');
    fixture.detectChanges();

    fixture.componentInstance.pickField('finish', 'foil');

    expect(filterService.filters().finish).toBe('foil');
    expect(filterService.openMenu()).toBe('');
  });

  it('shows the plain card count when no filters are active', () => {
    addCard();
    addCard();
    render();
    filterService.panelOpen.set(true);
    fixture.detectChanges();

    const result: HTMLElement = fixture.nativeElement.querySelector('.result-count');
    expect(result.textContent?.trim()).toBe('2 cartas');
  });

  it('shows "M de N cartas" and a Limpar button when filters are active', () => {
    addCard({ forSale: true });
    addCard({ forSale: false });
    render();
    filterService.panelOpen.set(true);
    filterService.setField('forSale', true);
    fixture.detectChanges();

    const result: HTMLElement = fixture.nativeElement.querySelector('.result-count');
    expect(result.textContent?.trim()).toBe('1 de 2 cartas');

    const clearBtn: HTMLElement = fixture.nativeElement.querySelector('.clear-btn');
    expect(clearBtn).toBeTruthy();

    clearBtn.click();
    fixture.detectChanges();

    expect(filterService.isActive()).toBe(false);
    expect(fixture.nativeElement.querySelector('.clear-btn')).toBeNull();
  });
});

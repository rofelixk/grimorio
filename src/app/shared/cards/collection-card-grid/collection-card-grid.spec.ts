import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockCardEntry } from '@testing/card.mocks';
import { CollectionCardGrid } from './collection-card-grid';

describe('CollectionCardGrid', () => {
  let component: CollectionCardGrid;
  let fixture: ComponentFixture<CollectionCardGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionCardGrid],
    }).compileComponents();

    fixture = TestBed.createComponent(CollectionCardGrid);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('cards', []);
    fixture.componentRef.setInput('viewMode', 'grid');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('shows the filters-active empty state when cards are empty, the query is empty, and filtersActive is true', () => {
    fixture.componentRef.setInput('filtersActive', true);
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyState.querySelector('h3').textContent).toContain('Nenhuma carta corresponde aos filtros.');

    let cleared = false;
    component.filtersCleared.subscribe(() => (cleared = true));
    emptyState.querySelector('button').click();

    expect(cleared).toBe(true);
  });

  it('falls back to the first-run empty state when filtersActive is false and the query is empty', () => {
    fixture.componentRef.setInput('filtersActive', false);
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyState.querySelector('h3').textContent).toContain('Nenhuma carta aqui ainda.');
  });

  it('falls back to the query empty state when filtersActive is false and the query is non-empty', () => {
    fixture.componentRef.setInput('filtersActive', false);
    fixture.componentRef.setInput('filterQuery', 'bolt');
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyState.querySelector('h3').textContent).toContain('Nenhuma carta corresponde a "bolt".');

    let cleared = false;
    component.filterCleared.subscribe(() => (cleared = true));
    emptyState.querySelector('button').click();

    expect(cleared).toBe(true);
  });

  it('renders the grid instead of an empty state once there are cards', () => {
    fixture.componentRef.setInput('cards', [mockCardEntry()]);
    fixture.componentRef.setInput('filtersActive', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
    expect(fixture.nativeElement.querySelector('.card-grid')).toBeTruthy();
  });
});

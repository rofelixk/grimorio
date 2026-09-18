import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { StorageLocationNode } from '@models/storage-location.model';
import { LocationPlate } from './location-plate';

const node: StorageLocationNode = {
  id: 'loc-1',
  name: 'Caixa Commander',
  parentId: null,
  children: [{ id: 'loc-1a', name: 'Divisória A', parentId: 'loc-1', children: [] }],
};

describe('LocationPlate', () => {
  let fixture: ComponentFixture<LocationPlate>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LocationPlate],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationPlate);
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();
  });

  it('reflects the closed state via aria-expanded and inert', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.plate-toggle');
    const panel: HTMLElement = fixture.nativeElement.querySelector('.collapse-inner');

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hasAttribute('inert')).toBe(true);
  });

  it('reflects the open state via aria-expanded and inert', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.plate-toggle');
    const panel: HTMLElement = fixture.nativeElement.querySelector('.collapse-inner');

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hasAttribute('inert')).toBe(false);
  });

  it('emits togglePlate when the toggle button is clicked', () => {
    let emitted = 0;
    fixture.componentInstance.togglePlate.subscribe(() => emitted++);

    fixture.nativeElement.querySelector('.plate-toggle').click();

    expect(emitted).toBe(1);
  });

  it('links the name to the location itself, separate from the toggle', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.plate-name');

    expect(link.getAttribute('href')).toBe('/collection/loc-1');
  });

  it('emits locationDeleted with the plate id when its delete button is clicked', () => {
    const ids: string[] = [];
    fixture.componentInstance.locationDeleted.subscribe((id) => ids.push(id));

    fixture.nativeElement.querySelector('.plate-delete').click();

    expect(ids).toEqual(['loc-1']);
  });

  it('emits locationDeleted with a sublocation id when its delete button is clicked', () => {
    const ids: string[] = [];
    fixture.componentInstance.locationDeleted.subscribe((id) => ids.push(id));

    fixture.nativeElement.querySelector('.sub-delete').click();

    expect(ids).toEqual(['loc-1a']);
  });
});

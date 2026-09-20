import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { StorageLocationService } from '@services/storage-location.service';
import { getLocationAccent } from '@utils/card-color.util';
import { LocationStrip } from './location-strip';

describe('LocationStrip', () => {
  let fixture: ComponentFixture<LocationStrip>;
  let locationsService: StorageLocationService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LocationStrip],
      providers: [provideRouter([])],
    }).compileComponents();

    locationsService = TestBed.inject(StorageLocationService);
  });

  it('renders one plate per child plus the add cell', () => {
    const parent = locationsService.add({ name: 'Box 1', parentId: null });
    locationsService.add({ name: 'Divisória A', parentId: parent.id });
    locationsService.add({ name: 'Divisória B', parentId: parent.id });

    fixture = TestBed.createComponent(LocationStrip);
    fixture.componentRef.setInput('parentId', parent.id);
    fixture.detectChanges();

    const plates: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li.plate'));
    expect(plates.length).toBe(3); // 2 children + add cell
    expect(fixture.nativeElement.textContent).toContain('Divisória A');
    expect(fixture.nativeElement.textContent).toContain('Divisória B');
  });

  it('getLocationAccent is stable for a given id', () => {
    const id = 'a-stable-id';
    expect(getLocationAccent(id)).toBe(getLocationAccent(id));
  });
});

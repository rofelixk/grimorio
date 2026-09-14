import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { StorageLocationService } from '@services/storage-location.service';
import { LocationDetail } from './location-detail';

describe('LocationDetail', () => {
  let component: LocationDetail;
  let fixture: ComponentFixture<LocationDetail>;
  let locationsService: StorageLocationService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LocationDetail],
      providers: [provideRouter([])],
    }).compileComponents();

    locationsService = TestBed.inject(StorageLocationService);
    const location = locationsService.add({ name: 'Box 1', parentId: null });

    fixture = TestBed.createComponent(LocationDetail);
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

  it('defaults to manual entry and switches to the scan form', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-add-card-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-card-scan-form')).toBeFalsy();

    component.addMode.set('scan');
    fixture.detectChanges();
    await fixture.whenStable();

    // card-scan-form nests app-add-card-form internally for the physical-detail step,
    // so only its presence (not add-card-form's absence) distinguishes scan mode.
    expect(fixture.nativeElement.querySelector('app-card-scan-form')).toBeTruthy();
  });
});

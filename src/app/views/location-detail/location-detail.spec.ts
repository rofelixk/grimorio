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

  it('opens the add-card modal when the trigger button is clicked', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.showAddModal()).toBe(false);

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const button = buttons.find((b) => b.textContent?.trim() === 'Adicionar carta');
    button?.click();

    expect(component.showAddModal()).toBe(true);
  });
});

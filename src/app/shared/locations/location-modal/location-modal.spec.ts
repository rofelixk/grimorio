import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { StorageLocationService } from '@services/storage-location.service';
import { ThemeService } from '@services/theme.service';
import { LocationModal } from './location-modal';

describe('LocationModal', () => {
  let component: LocationModal;
  let fixture: ComponentFixture<LocationModal>;
  let locationsService: StorageLocationService;
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LocationModal],
    }).compileComponents();

    locationsService = TestBed.inject(StorageLocationService);
    themeService = TestBed.inject(ThemeService);
    fixture = TestBed.createComponent(LocationModal);
    component = fixture.componentInstance;
  });

  function setName(value: string): void {
    component.name.set(value);
  }

  it('creates a location and emits saved', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('parentId', null);
    fixture.detectChanges();

    let saved: unknown;
    component.saved.subscribe((entry) => (saved = entry));

    setName('Divisória A');
    component.submit();

    expect(saved).toBeTruthy();
    expect(locationsService.locations().some((loc) => loc.name === 'Divisória A')).toBe(true);
  });

  it('defaults a new location color to the user current primary theme color', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('parentId', null);
    fixture.detectChanges();

    setName('Divisória A');
    component.submit();

    const primary = themeService.colors()[0];
    expect(locationsService.locations().find((loc) => loc.name === 'Divisória A')?.color).toBe(
      primary,
    );
  });

  it('keeps an existing location color when renaming', () => {
    const existing = locationsService.add({ name: 'Divisória A', parentId: null, color: 'G' });

    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('location', existing);
    fixture.detectChanges();

    setName('Divisória B');
    component.submit();

    expect(locationsService.locations().find((loc) => loc.id === existing.id)?.color).toBe('G');
  });

  it('blocks submit and shows an error for an empty name', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    setName('   ');
    component.submit();

    expect(component.error()).toBe('Dê um nome ao local.');
    expect(locationsService.locations()).toEqual([]);
  });

  it('blocks submit and shows an error for a duplicate sibling name', () => {
    locationsService.add({ name: 'Divisória A', parentId: null });

    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('parentId', null);
    fixture.detectChanges();

    setName('divisória a');
    component.submit();

    expect(component.error()).toBe('Já existe um local com esse nome aqui.');
    expect(locationsService.locations().length).toBe(1);
  });

  it('emits closed without adding when cancelled', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component.onNativeClose();

    expect(closed).toBe(true);
    expect(locationsService.locations()).toEqual([]);
  });
});

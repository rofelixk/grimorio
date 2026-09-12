import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { StorageLocationService } from '../../core/services/storage-location.service';
import { LocationChildren } from './location-children';

describe('LocationChildren', () => {
  let component: LocationChildren;
  let fixture: ComponentFixture<LocationChildren>;
  let locationsService: StorageLocationService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LocationChildren],
      providers: [provideRouter([])],
    }).compileComponents();

    locationsService = TestBed.inject(StorageLocationService);
    fixture = TestBed.createComponent(LocationChildren);
    fixture.componentRef.setInput('parentId', null);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists only locations matching parentId', () => {
    const root = locationsService.add({ name: 'Box 1', parentId: null });
    locationsService.add({ name: 'Binder A', parentId: root.id });

    expect(component.children()).toEqual([root]);
  });

  it('adds a child scoped to parentId', () => {
    component.newChildName.set('Box 1');
    component.addChild();

    expect(component.children().length).toBe(1);
    expect(component.children()[0].parentId).toBeNull();
    expect(component.newChildName()).toBe('');
  });

  it('removes a child', () => {
    const root = locationsService.add({ name: 'Box 1', parentId: null });

    component.removeChild(root.id);

    expect(component.children()).toEqual([]);
  });
});

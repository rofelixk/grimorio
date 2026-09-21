import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { NavBar } from './nav-bar';
import { CollectionFilters } from '@shared/locations/collection-filters/collection-filters';

@Component({ selector: 'app-test-blank', template: '', standalone: true })
class BlankTestComponent {}

describe('NavBar', () => {
  let component: NavBar;
  let fixture: ComponentFixture<NavBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavBar],
      providers: [provideRouter([{ path: 'decks', component: NavBar }])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with the drawer closed', () => {
    expect(component.drawerOpen()).toBe(false);
  });

  it('toggles the drawer open and closed', () => {
    component.toggleDrawer();
    expect(component.drawerOpen()).toBe(true);

    component.toggleDrawer();
    expect(component.drawerOpen()).toBe(false);
  });

  it('closeDrawer forces the drawer shut', () => {
    component.toggleDrawer();
    component.closeDrawer();

    expect(component.drawerOpen()).toBe(false);
  });
});

describe('NavBar collection filters mounting', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavBar],
      providers: [
        provideRouter([
          { path: 'collection/:id', component: BlankTestComponent, data: { showCollectionFilters: true } },
          { path: 'decks', component: BlankTestComponent },
        ]),
      ],
    }).compileComponents();
  });

  it('renders app-collection-filters with the active route id on /collection/:id', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/collection/loc-123');

    const fixture = TestBed.createComponent(NavBar);
    await fixture.whenStable();

    expect(fixture.componentInstance.collectionLocationId()).toBe('loc-123');
    const filtersDebugEl = fixture.debugElement.query(By.directive(CollectionFilters));
    expect(filtersDebugEl).toBeTruthy();
    expect((filtersDebugEl.componentInstance as CollectionFilters).locationId()).toBe('loc-123');
  });

  it('does not render app-collection-filters on other routes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/decks');

    const fixture = TestBed.createComponent(NavBar);
    await fixture.whenStable();

    expect(fixture.componentInstance.collectionLocationId()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-collection-filters')).toBeNull();
  });
});

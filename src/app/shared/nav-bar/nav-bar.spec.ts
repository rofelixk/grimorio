import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { NavBar } from './nav-bar';

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

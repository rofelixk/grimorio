import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { NavBar } from './nav-bar';

describe('NavBar', () => {
  let component: NavBar;
  let fixture: ComponentFixture<NavBar>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavBar],
      providers: [provideRouter([{ path: 'decks', component: NavBar }])],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(NavBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('treats the root url as home', () => {
    expect(component.isHome()).toBe(true);
  });

  it('is not home after navigating elsewhere', async () => {
    await router.navigateByUrl('/decks');
    fixture.detectChanges();

    expect(component.isHome()).toBe(false);
  });
});

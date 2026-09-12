import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Decks } from './decks';

describe('Decks', () => {
  let component: Decks;
  let fixture: ComponentFixture<Decks>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Decks],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Decks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Collection } from './collection';

describe('Collection', () => {
  let component: Collection;
  let fixture: ComponentFixture<Collection>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Collection],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Collection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

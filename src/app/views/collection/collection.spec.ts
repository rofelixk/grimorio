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

  describe('hint', () => {
    it('shows the default hint when idle', () => {
      expect(component.hint()).toBe(
        'Busca por nome, set ou número do coletor — resultados mostram o local de cada carta.',
      );
    });

    it('shows the short-query hint while typing under 3 characters', () => {
      component.onQueryChange('so');

      expect(component.hint()).toBe('Digite pelo menos 3 letras para buscar.');
    });

    it('reverts to the default hint once the field is emptied again', () => {
      component.onQueryChange('so');
      component.onQueryChange('');

      expect(component.hint()).toBe(
        'Busca por nome, set ou número do coletor — resultados mostram o local de cada carta.',
      );
    });

    it('shows the results count line once in results mode', () => {
      component.onQueryChange('sol ring');
      component.onSubmit();

      expect(component.hint()).toBe('0 cartas em 0 locais para "sol ring".');
    });
  });

  describe('onSubmit', () => {
    it('does not switch modes for a query under 3 characters', () => {
      component.onQueryChange('so');
      component.onSubmit();

      expect(component.mode()).toBe('locations');
    });

    it('switches to results mode for a query of 3+ characters', () => {
      component.onQueryChange('sol');
      component.onSubmit();

      expect(component.mode()).toBe('results');
      expect(component.submittedQuery()).toBe('sol');
    });
  });

  describe('onClearOrBack', () => {
    it('resets mode, query, submittedQuery and locationFilter', () => {
      component.onQueryChange('sol ring');
      component.onSubmit();
      component.locationFilter.set('loc-1');

      component.onClearOrBack();

      expect(component.mode()).toBe('locations');
      expect(component.query()).toBe('');
      expect(component.submittedQuery()).toBe('');
      expect(component.locationFilter()).toBeNull();
    });
  });
});

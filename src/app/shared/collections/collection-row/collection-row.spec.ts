import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Collection, CollectionColorId, CollectionTotals } from '@models/collection.model';
import { describe, expect, it } from 'vitest';
import { CollectionRow } from './collection-row';

@Component({
  imports: [CollectionRow],
  template: `<app-collection-row [collection]="collection()" [totals]="totals()" (open)="opens = opens + 1" />`,
})
class Host {
  readonly collection = signal<Collection>(collection('Fichário azul', 'azul'));
  readonly totals = signal<CollectionTotals>({ cards: 1240, sale: 85, subs: 5, directEntries: 0 });
  opens = 0;
}

function collection(name: string, color: CollectionColorId): Collection {
  return { id: 'c1', name, color, parentId: null, updatedAt: '2026-09-28T00:00:00.000Z' };
}

describe('CollectionRow', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    return { fixture, button };
  }

  it('names the row with its color and pt-BR counts', () => {
    const { button } = render();
    expect(button.getAttribute('aria-label')).toBe(
      'Fichário azul, cor Azul. 1.240 cartas · 85 à venda · 5 subcoleções.',
    );
    expect(button.querySelector('.name')?.textContent).toBe('Fichário azul');
    expect(button.querySelector('.verb')?.textContent).toBe('Abrir');
    expect(button.querySelector('.swatch')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows "Vazia" with no cards and no subcollections', () => {
    const { fixture, button } = render();
    fixture.componentInstance.totals.set({ cards: 0, sale: 0, subs: 0, directEntries: 0 });
    fixture.detectChanges();
    expect(button.querySelector('.meta')?.textContent).toBe('Vazia');
    expect(button.getAttribute('aria-label')).toBe('Fichário azul, cor Azul. Vazia.');
  });

  it('omits the subcollection part when there are none, with singular forms', () => {
    const { fixture, button } = render();
    fixture.componentInstance.totals.set({ cards: 1, sale: 0, subs: 0, directEntries: 1 });
    fixture.detectChanges();
    expect(button.querySelector('.meta')?.textContent).toBe('1 carta · 0 à venda');
  });

  it('outlines the Carvão swatch', () => {
    const { fixture, button } = render();
    fixture.componentInstance.collection.set(collection('Caixa', 'carvao'));
    fixture.detectChanges();
    const swatch = button.querySelector<HTMLElement>('.swatch')!;
    expect(swatch.style.borderColor).toBe('rgb(107, 99, 92)');
    expect(button.getAttribute('aria-label')).toContain('cor Carvão.');
  });

  it('emits open on click', () => {
    const { fixture, button } = render();
    button.click();
    expect(fixture.componentInstance.opens).toBe(1);
  });
});

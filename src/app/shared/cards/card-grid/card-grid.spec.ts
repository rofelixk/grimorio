import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mockCardEntry } from '@testing/card.mocks';
import { CardEntry } from '@models/card.model';
import { afterEach, describe, expect, it } from 'vitest';
import { CardGrid } from './card-grid';

@Component({
  imports: [CardGrid],
  template: `<app-card-grid [cards]="cards()" [mode]="mode()" [editable]="editable()" (edit)="edited.push($event)" />`,
})
class Host {
  readonly cards = signal<CardEntry[]>([
    mockCardEntry({ id: 'a', name: 'Sol Ring', quantity: 2, finish: 'foil', language: 'pt', forSale: true }),
    mockCardEntry({ id: 'b', name: 'Lightning Bolt' }),
    mockCardEntry({ id: 'c', name: 'Counterspell' }),
  ]);
  readonly mode = signal<'images' | 'details'>('details');
  readonly editable = signal(true);
  readonly edited: CardEntry[] = [];
}

describe('CardGrid', () => {
  afterEach(() => TestBed.resetTestingModule());

  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, host: fixture.componentInstance, tiles: () => el.querySelectorAll('app-card-tile') };
  }

  it('renders every card in the given order', () => {
    const { el } = render();
    const labels = Array.from(el.querySelectorAll('.tile')).map((t) => t.getAttribute('aria-label')!);
    expect(labels.map((l) => l.split(',')[0])).toEqual(['Sol Ring', 'Lightning Bolt', 'Counterspell']);
  });

  it('builds the details and the accessible name from the entry', () => {
    const { el } = render();
    const first = el.querySelector('app-card-tile')!;
    expect(first.querySelector('.set')?.textContent).toBe('LEA · 161');
    expect(first.querySelector('.meta')?.textContent).toBe('Foil · PT · NM');
    expect(first.querySelector('.qty')?.textContent).toBe('×2');
    expect(first.querySelector('.micro-label')?.textContent).toBe('À venda');
    expect(first.querySelector('.tile')!.getAttribute('aria-label')).toBe(
      'Sol Ring, LEA 161, Foil, Português, NM, 2 cópias, à venda. Editar.',
    );
  });

  it('puts the mode class on the grid and the plate in flow or overlay', () => {
    const { fixture, el, host } = render();
    expect(el.querySelector('.grid')!.classList.contains('is-details')).toBe(true);
    expect(el.querySelector('.overlay')).toBeNull();

    host.mode.set('images');
    fixture.detectChanges();
    expect(el.querySelector('.grid')!.classList.contains('is-images')).toBe(true);
    expect(el.querySelectorAll('.overlay')).toHaveLength(3);
  });

  it('emits edit only when editable', () => {
    const { fixture, el, host } = render();
    el.querySelectorAll<HTMLButtonElement>('button.tile')[1].click();
    expect(host.edited.map((c) => c.id)).toEqual(['b']);

    host.editable.set(false);
    fixture.detectChanges();
    expect(el.querySelectorAll('button.tile')).toHaveLength(0);
    expect(el.querySelector('.tile')!.getAttribute('aria-label')).not.toContain('Editar');
    el.querySelector<HTMLElement>('.tile')!.click();
    expect(host.edited).toHaveLength(1);
  });
});

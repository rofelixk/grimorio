import { TestBed } from '@angular/core/testing';
import type { Collection } from '@models/collection.model';
import { mockCardEntry } from '@testing/card.mocks';
import { stubDialog } from '@testing/dialog';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MovedNotice } from './moved-notice';

const collection = (id: string, name: string, parentId: string | null = null): Collection => ({
  id,
  name,
  color: '#d8cdb0',
  parentId,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('MovedNotice', () => {
  let restore: () => void;

  beforeEach(() => {
    restore = stubDialog();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    restore();
  });

  function render() {
    const fixture = TestBed.createComponent(MovedNotice);
    fixture.componentRef.setInput('card', mockCardEntry({ name: 'Sol Ring', quantity: 2 }));
    fixture.componentRef.setInput('from', collection('a', 'Fichário'));
    fixture.componentRef.setInput('to', collection('b', 'Página 1', 'a'));
    let closes = 0;
    fixture.componentInstance.closed.subscribe(() => closes++);
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, closes: () => closes };
  }

  it('tells where the card went and shows its row', () => {
    const { el } = render();
    expect(el.querySelector('h2')?.textContent).toBe('Carta adicionada em outra coleção');
    expect(el.querySelector('.subtitle')?.textContent).toContain('“Fichário” ganhou subcoleções');
    expect(el.querySelector('.subtitle')?.textContent).toContain('“Página 1”');
    expect(el.querySelector('.name')?.textContent).toBe('Sol Ring');
    expect(el.querySelector('.card-row .micro-label')?.textContent).toBe('Página 1');
  });

  it('ignores Esc and ✕, and closes only through Ok', () => {
    const { el, closes } = render();
    el.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
    el.querySelector<HTMLButtonElement>('.close')?.click();
    expect(closes()).toBe(0);

    el.querySelector<HTMLButtonElement>('.actions .btn--primary')!.click();
    expect(closes()).toBe(1);
  });
});

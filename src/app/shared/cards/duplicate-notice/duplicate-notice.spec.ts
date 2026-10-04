import { TestBed } from '@angular/core/testing';
import type { Collection } from '@models/collection.model';
import type { CardDraft } from '@shared/cards/card-modal/card-modal';
import { mockCardEntry } from '@testing/card.mocks';
import { stubDialog } from '@testing/dialog';
import type { CardMatch } from '@utils/card-entry.util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DuplicateNotice, type DuplicateDecision } from './duplicate-notice';

const collection = (id: string, name: string): Collection => ({
  id,
  name,
  color: '#d8cdb0',
  parentId: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const draft = { ...mockCardEntry({ name: 'Sol Ring', quantity: 2, finish: 'foil' }) } as unknown as CardDraft;
const fichario = collection('a', 'Fichário');
const caixa = collection('b', 'Caixa');
const inFichario: CardMatch = { card: mockCardEntry({ id: 'm1', quantity: 3, locationId: 'a' }), collection: fichario };
const inCaixa: CardMatch = { card: mockCardEntry({ id: 'm2', quantity: 7, locationId: 'b' }), collection: caixa };

describe('DuplicateNotice', () => {
  let restore: () => void;

  beforeEach(() => {
    restore = stubDialog();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    restore();
  });

  function render(matches: CardMatch[], mode: 'add' | 'edit' = 'add') {
    const fixture = TestBed.createComponent(DuplicateNotice);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('draft', draft);
    fixture.componentRef.setInput('matches', matches);
    fixture.componentRef.setInput('destination', fichario);
    const decisions: DuplicateDecision[] = [];
    let closes = 0;
    fixture.componentInstance.decide.subscribe((d) => decisions.push(d));
    fixture.componentInstance.closed.subscribe(() => closes++);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const sub = (choice: string) => el.querySelector(`[data-choice="${choice}"] .choice-sub`)?.textContent?.trim();
    const click = (selector: string) => {
      el.querySelector<HTMLElement>(selector)!.click();
      fixture.detectChanges();
    };
    return { fixture, el, decisions, closes: () => closes, sub, click };
  }

  it('D1a names the collection and shows the matching row, merge preselected', () => {
    const { el, sub } = render([inFichario]);
    expect(el.querySelector('h2')?.textContent).toBe('Você já tem esta carta');
    expect(el.querySelector('.subtitle')?.textContent).toContain('Está em “Fichário”.');
    expect(el.querySelector('.match .micro-label')?.textContent).toBe('Fichário');
    expect(el.querySelector('.match .qty')?.textContent).toBe('×3');
    expect(el.querySelector('app-select-list')).toBeNull();
    expect(el.querySelector('[data-choice="merge"]')?.getAttribute('aria-checked')).toBe('true');
    expect(el.querySelector('[data-choice="merge"]')?.hasAttribute('data-autofocus')).toBe(true);
    expect(sub('merge')).toBe('A linha existente passa de 3 para 5 cópias e fica onde está.');
    expect(sub('other')).toBe('Cria uma nova linha em “Fichário”.');
  });

  it('D1b lists the places and the merge text follows the chosen one', () => {
    const { el, sub, click } = render([inFichario, inCaixa]);
    expect(el.querySelector('h2')?.textContent).toBe('Você já tem esta carta em 2 lugares');
    expect(el.querySelector('.match')).toBeNull();
    expect(el.querySelector('app-select-list .trigger')?.textContent).toContain('Fichário');
    expect(sub('merge')).toContain('passa de 3 para 5');
    expect(sub('other')).toBe('Cria uma nova linha em “Fichário”, a coleção que você está usando.');

    click('app-select-list .trigger');
    click('[role="option"][data-index="1"]');
    expect(el.querySelector('app-select-list .trigger')?.textContent).toContain('Caixa');
    expect(sub('merge')).toContain('passa de 7 para 9');
  });

  it('emits merge with the chosen match', () => {
    const { decisions, click } = render([inFichario, inCaixa]);
    click('app-select-list .trigger');
    click('[role="option"][data-index="1"]');
    click('.actions .btn--primary');
    expect(decisions).toEqual([{ choice: 'merge', match: inCaixa }]);
  });

  it('emits separate on add and keep on edit', () => {
    const add = render([inFichario]);
    add.click('[data-choice="other"]');
    add.click('.actions .btn--primary');
    expect(add.decisions).toEqual([{ choice: 'separate', match: inFichario }]);
    add.fixture.destroy();

    const edit = render([inFichario], 'edit');
    expect(edit.el.querySelector('[data-choice="other"] .choice-title')?.textContent).toBe('Manter as duas linhas');
    edit.click('[data-choice="other"]');
    edit.click('.actions .btn--primary');
    expect(edit.decisions).toEqual([{ choice: 'keep', match: inFichario }]);
  });

  it('the edit variant shows the edited card above the match and its own texts', () => {
    const { el, sub } = render([inFichario], 'edit');
    expect(el.querySelector('.subtitle')?.textContent).toContain('igual a outra que você já tem em “Fichário”');
    expect(el.querySelector('.edited .meta')?.textContent).toBe('Foil · EN · NM');
    expect(el.querySelector('.edited .qty')?.textContent).toBe('×2');
    expect(sub('merge')).toContain('(3 → 5 cópias), e esta linha deixa de existir');
  });

  it('arrow keys move the radio selection', () => {
    const { el, fixture } = render([inFichario]);
    el.querySelector('[data-choice="merge"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(el.querySelector('[data-choice="other"]')?.getAttribute('aria-checked')).toBe('true');
  });

  it('Cancel closes without a decision', () => {
    const { decisions, closes, click } = render([inFichario]);
    click('.actions .btn--ghost');
    expect(closes()).toBe(1);
    expect(decisions).toEqual([]);
  });
});

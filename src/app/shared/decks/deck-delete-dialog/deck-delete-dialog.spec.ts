import { TestBed } from '@angular/core/testing';
import type { Deck } from '@models/deck.model';
import { CardService } from '@services/card.service';
import { DeckService } from '@services/deck.service';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { stubDialog } from '@testing/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeckDeleteDialog, type DeckDeleted } from './deck-delete-dialog';

describe('DeckDeleteDialog', () => {
  let restore: () => void;
  let decks: DeckService;
  let cards: CardService;

  beforeEach(async () => {
    restore = stubDialog();
    decks = TestBed.inject(DeckService);
    cards = TestBed.inject(CardService);
    await cards.load('p1');
    await decks.load('p1');
  });

  afterEach(async () => {
    await decks.flush();
    await cards.flush();
    TestBed.resetTestingModule();
    restore();
  });

  function make(name: string): Deck {
    const result = decks.create({ name, format: 'commander' });
    if (!result.ok) throw new Error(result.error);
    return result.deck;
  }

  async function render(deckId: string) {
    const fixture = TestBed.createComponent(DeckDeleteDialog);
    fixture.componentRef.setInput('deckId', deckId);
    const deleted: DeckDeleted[] = [];
    let closes = 0;
    fixture.componentInstance.deleted.subscribe((d) => deleted.push(d));
    fixture.componentInstance.closed.subscribe(() => closes++);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const confirm = () => el.querySelector<HTMLButtonElement>('.btn--danger')!;
    const cancel = () => el.querySelector<HTMLButtonElement>('.btn--ghost')!;
    return { fixture, el, confirm, cancel, deleted, closes: () => closes };
  }

  it('is a plain confirmation for a deck with no cards', async () => {
    const deck = make('Elfos');
    const { el, confirm, cancel } = await render(deck.id);

    expect(el.querySelector('h2')?.textContent).toBe('Excluir Elfos?');
    expect(el.querySelector('.subtitle')?.textContent).toBe('Não há cartas aqui. Nada mais é afetado.');
    expect(confirm().textContent?.trim()).toBe('Excluir deck');
    expect(document.activeElement).toBe(cancel());
  });

  it('says where the deck cards go', async () => {
    const deck = make('Elfos');
    cards.add(mockCardEntryWithoutId({ locationId: deck.id, quantity: 60 }));
    const { el } = await render(deck.id);

    expect(el.querySelector('.subtitle')?.textContent).toBe(
      'As 60 cartas deste deck vão para a caixa temporária, com todos os dados, até você guardá-las em outro lugar. Nada mais é afetado.',
    );
  });

  it('locks while deleting, ignores a second confirm, then emits the captured payload', async () => {
    const deck = make('Elfos');
    cards.add(mockCardEntryWithoutId({ locationId: deck.id, quantity: 3 }));
    const remove = vi.spyOn(decks, 'remove');
    const { el, fixture, confirm, cancel, deleted, closes } = await render(deck.id);

    confirm().click();
    fixture.detectChanges();
    expect(confirm().textContent?.trim()).toBe('Excluindo…');
    expect(confirm().getAttribute('aria-disabled')).toBe('true');
    expect(cancel().getAttribute('aria-disabled')).toBe('true');
    expect(el.querySelector('.close')?.getAttribute('aria-disabled')).toBe('true');

    const dialog = el.querySelector('dialog')!;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    el.querySelector<HTMLButtonElement>('.close')!.click();
    cancel().click();
    confirm().click();
    expect(closes()).toBe(0);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(el.querySelector('h2')?.textContent).toBe('Excluir Elfos?');

    await decks.flush();
    await fixture.whenStable();
    expect(deleted).toEqual([{ name: 'Elfos', cards: 3 }]);
  });

  it('cancels without changing anything', async () => {
    const deck = make('Elfos');
    const { cancel, closes, deleted } = await render(deck.id);
    cancel().click();

    expect(closes()).toBe(1);
    expect(deleted).toEqual([]);
    expect(decks.byId().has(deck.id)).toBe(true);
  });
});

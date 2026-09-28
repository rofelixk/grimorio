import { TestBed } from '@angular/core/testing';
import type { Collection } from '@models/collection.model';
import { CardService } from '@services/card.service';
import { CollectionService } from '@services/collection.service';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { stubDialog } from '@testing/dialog';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CollectionDeleteDialog, type CollectionDeleted } from './collection-delete-dialog';

describe('CollectionDeleteDialog', () => {
  let restore: () => void;
  let collections: CollectionService;
  let cards: CardService;

  beforeEach(async () => {
    restore = stubDialog();
    collections = TestBed.inject(CollectionService);
    cards = TestBed.inject(CardService);
    await cards.load('p1');
    await collections.load('p1');
  });

  afterEach(async () => {
    await collections.flush();
    await cards.flush();
    TestBed.resetTestingModule();
    restore();
  });

  function make(name: string, parentId: string | null = null): Collection {
    const result = collections.create({ parentId, name, color: 'azul' });
    if (!result.ok) throw new Error(result.error);
    return result.collection;
  }

  async function render(collectionId: string) {
    const fixture = TestBed.createComponent(CollectionDeleteDialog);
    fixture.componentRef.setInput('collectionId', collectionId);
    const deleted: CollectionDeleted[] = [];
    let closes = 0;
    fixture.componentInstance.deleted.subscribe((d) => deleted.push(d));
    fixture.componentInstance.closed.subscribe(() => closes++);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const confirm = () => el.querySelector<HTMLButtonElement>('.btn--danger')!;
    const cancel = () => el.querySelector<HTMLButtonElement>('.btn--ghost')!;
    const radio = (choice: 'move' | 'delete') => el.querySelector<HTMLButtonElement>(`[data-choice="${choice}"]`)!;
    return { fixture, el, confirm, cancel, radio, deleted, closes: () => closes };
  }

  it('is a plain confirmation for a collection with no cards', async () => {
    const top = make('Álbum');
    const { el, confirm, cancel } = await render(top.id);
    expect(el.querySelector('h2')?.textContent).toBe('Excluir Álbum?');
    expect(el.querySelector('.subtitle')?.textContent).toBe('Não há cartas aqui. Nada mais é afetado.');
    expect(el.querySelector('[role="radiogroup"]')).toBeNull();
    expect(confirm().textContent?.trim()).toBe('Excluir coleção');
    expect(confirm().hasAttribute('aria-disabled')).toBe(false);
    expect(document.activeElement).toBe(cancel());
  });

  it('names the subcollections that go with an empty tree', async () => {
    const top = make('Fichário');
    make('Azuis', top.id);
    make('Verdes', top.id);
    const { el } = await render(top.id);
    expect(el.querySelector('.subtitle')?.textContent).toBe('Não há cartas aqui. As 2 subcoleções vão junto.');
  });

  it('asks for a choice when the subtree holds cards, with nothing preselected', async () => {
    const top = make('Fichário');
    const child = make('Azuis', top.id);
    cards.add(mockCardEntryWithoutId({ locationId: child.id, quantity: 12 }));
    const { el, fixture, confirm, radio, deleted } = await render(top.id);

    expect(el.querySelector('.subtitle')?.textContent).toBe(
      'A subcoleção vai junto. Há 12 cartas guardadas aqui — escolha o que fazer com elas.',
    );
    expect(radio('move').getAttribute('aria-checked')).toBe('false');
    expect(radio('delete').getAttribute('aria-checked')).toBe('false');
    expect(radio('delete').querySelector('.choice-sub')?.textContent).toBe(
      'As 12 cartas saem do app. Não dá para desfazer.',
    );
    expect(confirm().getAttribute('aria-disabled')).toBe('true');

    confirm().click();
    await fixture.whenStable();
    expect(deleted).toEqual([]);
    expect(collections.byId().has(top.id)).toBe(true);

    radio('delete').click();
    fixture.detectChanges();
    expect(radio('delete').getAttribute('aria-checked')).toBe('true');
    expect(confirm().hasAttribute('aria-disabled')).toBe(false);
  });

  it('switches the choice with the arrow keys', async () => {
    const top = make('Caixa');
    cards.add(mockCardEntryWithoutId({ locationId: top.id }));
    const { fixture, radio } = await render(top.id);
    radio('move').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(radio('move').getAttribute('aria-checked')).toBe('true');
    radio('move').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(radio('delete').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radio('delete'));
  });

  it('locks while deleting, then emits the captured payload', async () => {
    const top = make('Fichário');
    const child = make('Azuis', top.id);
    cards.add(mockCardEntryWithoutId({ locationId: child.id, quantity: 4 }));
    const { el, fixture, confirm, cancel, radio, deleted, closes } = await render(child.id);
    expect(confirm().textContent?.trim()).toBe('Excluir subcoleção');

    radio('move').click();
    fixture.detectChanges();
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
    expect(closes()).toBe(0);
    // The title survives the collection leaving the signal.
    expect(el.querySelector('h2')?.textContent).toBe('Excluir Azuis?');

    await collections.flush();
    await fixture.whenStable();
    expect(deleted).toEqual([
      { parentId: top.id, name: 'Azuis', choice: 'move', result: { collections: 1, cards: 4 } },
    ]);
  });

  it('cancels without changing anything', async () => {
    const top = make('Álbum');
    const { cancel, closes, deleted } = await render(top.id);
    cancel().click();
    expect(closes()).toBe(1);
    expect(deleted).toEqual([]);
    expect(collections.byId().has(top.id)).toBe(true);
  });
});

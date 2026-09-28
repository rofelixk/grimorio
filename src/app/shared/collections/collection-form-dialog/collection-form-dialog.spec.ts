import { TestBed } from '@angular/core/testing';
import type { Collection } from '@models/collection.model';
import { CardService } from '@services/card.service';
import { CollectionService } from '@services/collection.service';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import { stubDialog } from '@testing/dialog';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CollectionFormDialog } from './collection-form-dialog';

describe('CollectionFormDialog', () => {
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

  async function render(inputs: { mode: 'create' | 'edit'; parentId?: string | null; collectionId?: string }) {
    const fixture = TestBed.createComponent(CollectionFormDialog);
    fixture.componentRef.setInput('mode', inputs.mode);
    fixture.componentRef.setInput('parentId', inputs.parentId ?? null);
    if (inputs.collectionId) fixture.componentRef.setInput('collectionId', inputs.collectionId);
    const saved: Collection[] = [];
    let closes = 0;
    fixture.componentInstance.saved.subscribe((c) => saved.push(c));
    fixture.componentInstance.closed.subscribe(() => closes++);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('.field__input')!;
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const submit = () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();
    };
    const checked = () => el.querySelector('[role="radio"][aria-checked="true"]')?.getAttribute('aria-label');
    return { fixture, el, input, type, submit, checked, saved, closes: () => closes };
  }

  function make(name: string, parentId: string | null = null, color: Collection['color'] = 'branco'): Collection {
    const result = collections.create({ parentId, name, color });
    if (!result.ok) throw new Error(result.error);
    return result.collection;
  }

  it('titles a new collection and preselects the first unused color', async () => {
    make('Um', null, 'branco');
    make('Dois', null, 'azul');
    const { el, input, checked } = await render({ mode: 'create' });
    expect(el.querySelector('h2')?.textContent).toBe('Nova coleção');
    expect(el.querySelector('dialog')?.getAttribute('aria-labelledby')).toBe(el.querySelector('h2')?.id);
    expect(el.querySelector('.subtitle')).toBeNull();
    expect(document.activeElement).toBe(input);
    expect(checked()).toBe('Violeta');
    expect(el.querySelector('.btn--primary')?.textContent).toBe('Criar coleção');
  });

  it('shows each name error in place of the helper, and clears it on typing', async () => {
    make('Fichário');
    const { el, input, type, submit, saved } = await render({ mode: 'create' });
    expect(el.querySelector('.field__helper')?.textContent).toBe('Uma caixa, um fichário, uma divisória.');

    submit();
    expect(el.querySelector('.field__error')?.textContent).toBe('Dê um nome à coleção.');
    expect(el.querySelector('.field__helper')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(el.querySelector('.field__error')?.id);

    type('x'.repeat(41));
    expect(el.querySelector('.field__error')).toBeNull();
    submit();
    expect(el.querySelector('.field__error')?.textContent).toBe('Use no máximo 40 caracteres.');

    type(' fichário ');
    submit();
    expect(el.querySelector('.field__error')?.textContent).toBe('Já existe uma coleção com esse nome aqui.');
    expect(saved).toEqual([]);
  });

  it('counts characters and turns the counter danger past 40', async () => {
    const { el, type } = await render({ mode: 'create' });
    type('x'.repeat(40));
    const counter = el.querySelector('.counter')!;
    expect(counter.textContent).toBe('40/40');
    expect(counter.classList).not.toContain('counter--over');
    type('x'.repeat(41));
    expect(counter.textContent).toBe('41/40');
    expect(counter.classList).toContain('counter--over');
  });

  it('creates on submit (Enter) with the picked color', async () => {
    const { el, fixture, type, submit, saved } = await render({ mode: 'create' });
    type('Fichário vermelho');
    el.querySelectorAll<HTMLButtonElement>('[role="radio"]')[3].click();
    fixture.detectChanges();
    submit();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'Fichário vermelho', color: 'vermelho', parentId: null });
  });

  it('cancels without saving', async () => {
    const { el, saved, closes } = await render({ mode: 'create' });
    el.querySelector<HTMLButtonElement>('.btn--ghost')!.click();
    expect(closes()).toBe(1);
    expect(saved).toEqual([]);
    expect(collections.collections()).toEqual([]);
  });

  it('prefills edit mode and saves the new name and color', async () => {
    const existing = make('Raras', null, 'ocre');
    const { el, input, type, submit, checked, saved } = await render({ mode: 'edit', collectionId: existing.id });
    expect(el.querySelector('h2')?.textContent).toBe('Editar coleção');
    expect(input.value).toBe('Raras');
    expect(checked()).toBe('Ocre');
    expect(el.querySelector('.btn--primary')?.textContent).toBe('Salvar');

    type('Raras e míticas');
    submit();
    expect(saved[0]).toMatchObject({ id: existing.id, name: 'Raras e míticas', color: 'ocre' });
  });

  describe('subcollections', () => {
    it('titles and subtitles a new subcollection', async () => {
      const parent = make('Fichário');
      const { el } = await render({ mode: 'create', parentId: parent.id });
      expect(el.querySelector('h2')?.textContent).toBe('Nova subcoleção');
      expect(el.querySelector('.subtitle')?.textContent).toBe('Dentro de Fichário.');
      expect(el.querySelector('.plate')).toBeNull();
      expect(el.querySelector('.btn--primary')?.textContent).toBe('Criar subcoleção');
    });

    it('titles an edited subcollection from its own parent', async () => {
      const parent = make('Fichário');
      const child = make('Azuis', parent.id);
      const { el } = await render({ mode: 'edit', collectionId: child.id });
      expect(el.querySelector('h2')?.textContent).toBe('Editar subcoleção');
      expect(el.querySelector('.subtitle')?.textContent).toBe('Dentro de Fichário.');
    });

    it('announces the move for a parent that holds cards', async () => {
      const parent = make('Caixa de trocas');
      cards.add(mockCardEntryWithoutId({ locationId: parent.id, quantity: 12 }));
      const { el } = await render({ mode: 'create', parentId: parent.id });
      expect(el.querySelector('.plate')?.textContent).toBe(
        'Caixa de trocas tem 12 cartas. Uma coleção guarda cartas ou subcoleções — elas vão para esta nova subcoleção.',
      );
      expect(el.querySelector('.btn--primary')?.textContent).toBe('Criar e mover cartas');
    });
  });
});

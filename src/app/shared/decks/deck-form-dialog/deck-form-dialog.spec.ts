import { TestBed } from '@angular/core/testing';
import type { Deck } from '@models/deck.model';
import { DeckService } from '@services/deck.service';
import { stubDialog } from '@testing/dialog';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DeckFormDialog } from './deck-form-dialog';

describe('DeckFormDialog', () => {
  let restore: () => void;
  let decks: DeckService;

  beforeEach(async () => {
    restore = stubDialog();
    decks = TestBed.inject(DeckService);
    await decks.load('p1');
  });

  afterEach(async () => {
    await decks.flush();
    TestBed.resetTestingModule();
    restore();
  });

  async function render(inputs: { mode: 'create' | 'edit'; deckId?: string }) {
    const fixture = TestBed.createComponent(DeckFormDialog);
    fixture.componentRef.setInput('mode', inputs.mode);
    if (inputs.deckId) fixture.componentRef.setInput('deckId', inputs.deckId);
    const saved: Deck[] = [];
    let closes = 0;
    fixture.componentInstance.saved.subscribe((d) => saved.push(d));
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
    const checked = () => el.querySelector('[role="radio"][aria-checked="true"]')?.textContent?.trim();
    const errorText = () => el.querySelector('.field__error')?.textContent?.trim();
    return { fixture, el, input, type, submit, checked, errorText, saved, closes: () => closes };
  }

  function make(name: string, format: Deck['format'] = 'commander'): Deck {
    const result = decks.create({ name, format });
    if (!result.ok) throw new Error(result.error);
    return result.deck;
  }

  it('preselects Commander and titles the create form', async () => {
    const { el, checked } = await render({ mode: 'create' });
    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Novo deck');
    expect(checked()).toBe('Commander');
    expect(el.querySelector('.rules')?.textContent).toContain('Exatamente 100 cartas');
  });

  it('shows each name error in PT-BR, marking the field invalid', async () => {
    make('Krenko goblins');
    const { input, type, submit, errorText } = await render({ mode: 'create' });

    submit();
    expect(errorText()).toBe('Dê um nome ao deck.');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    type('a'.repeat(41));
    submit();
    expect(errorText()).toBe('Use no máximo 40 caracteres.');

    type('krênko GOBLINS');
    submit();
    expect(errorText()).toBe('Já existe um deck com esse nome.');
  });

  it('clears the error on the next input', async () => {
    const { el, input, type, submit, errorText } = await render({ mode: 'create' });
    submit();
    expect(errorText()).toBeDefined();

    type('E');
    expect(errorText()).toBeUndefined();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(el.querySelector('.field__helper')?.textContent?.trim()).toBe('Como você reconhece o deck.');
  });

  it('turns the counter danger over 40 characters', async () => {
    const { el, type } = await render({ mode: 'create' });
    type('a'.repeat(41));
    expect(el.querySelector('.counter')?.textContent?.trim()).toBe('41/40');
    expect(el.querySelector('.counter')?.classList).toContain('counter--over');
  });

  it('creates with the picked format and emits saved', async () => {
    const { el, fixture, type, submit, saved } = await render({ mode: 'create' });
    type('Fadas');
    el.querySelectorAll<HTMLButtonElement>('[role="radio"]')[1].click();
    fixture.detectChanges();
    submit();

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'Fadas', format: 'pauper' });
  });

  it('prefills name and format on edit and saves the change', async () => {
    const deck = make('Elfos', 'legacy');
    const { el, input, checked, type, submit, saved } = await render({ mode: 'edit', deckId: deck.id });

    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Editar deck');
    expect(input.value).toBe('Elfos');
    expect(checked()).toBe('Legacy');

    type('Elfos do Legacy');
    submit();
    expect(saved[0]).toMatchObject({ id: deck.id, name: 'Elfos do Legacy', format: 'legacy' });
  });

  it('closes when the edited deck is gone', async () => {
    const deck = make('Elfos');
    const { submit, closes } = await render({ mode: 'edit', deckId: deck.id });
    await decks.remove(deck.id);
    submit();
    expect(closes()).toBe(1);
  });
});

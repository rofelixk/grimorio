import { TestBed } from '@angular/core/testing';
import { CatalogError, type CatalogCard, type SearchPage } from '@models/catalog.model';
import { CardCatalogService } from '@services/card-catalog.service';
import { stubDialog } from '@testing/dialog';
import { installIntersectionObserver, intersect, restoreIntersectionObserver } from '@testing/intersection-observer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardSearchModal, SEARCH_DEBOUNCE_MS } from './card-search-modal';

const ROLES = {
  primary: '#111111',
  primaryHover: '#222222',
  accent: '#333333',
  accentHover: '#444444',
  tertiary: '#555555',
  tertiaryHover: '#666666',
};

const card = (n: number): CatalogCard => ({
  oracleId: `o${n}`,
  name: `Card ${n}`,
  typeLine: 'Artifact',
  colorIdentity: [],
  imageUrl: null,
});

type Answer = SearchPage | CatalogError;

class FakeCatalog {
  calls: { text: string; page: number }[] = [];
  pending: { resolve: (page: SearchPage) => void; reject: (error: unknown) => void }[] = [];
  answers: Answer[] = [];

  search(text: string, page: number): Promise<SearchPage> {
    this.calls.push({ text, page });
    const next = this.answers.shift();
    if (next) {
      return next instanceof CatalogError ? Promise.reject(next) : Promise.resolve(next);
    }
    return new Promise((resolve, reject) => this.pending.push({ resolve, reject }));
  }
}

describe('CardSearchModal', () => {
  let restoreDialog: () => void;
  let catalog: FakeCatalog;

  beforeEach(() => {
    vi.useFakeTimers();
    restoreDialog = stubDialog();
    installIntersectionObserver();
    catalog = new FakeCatalog();
    TestBed.configureTestingModule({ providers: [{ provide: CardCatalogService, useValue: catalog }] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    restoreIntersectionObserver();
    restoreDialog();
    vi.useRealTimers();
  });

  async function render() {
    const fixture = TestBed.createComponent(CardSearchModal);
    fixture.componentRef.setInput('roles', ROLES);
    const picked: CatalogCard[] = [];
    let closes = 0;
    fixture.componentInstance.pick.subscribe((c) => picked.push(c));
    fixture.componentInstance.closed.subscribe(() => closes++);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('.field__input')!;
    const settle = async () => {
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();
    };
    const type = async (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();
      await settle();
    };
    const text = () => el.querySelector('.results')!.textContent!.replace(/\s+/g, ' ').trim();
    const live = () => el.querySelector('[role="status"]')!.textContent!.trim();
    const tiles = () => el.querySelectorAll('app-card-tile button');
    return { fixture, el, input, type, settle, text, live, tiles, picked, closes: () => closes };
  }

  it('shows the idle text and the field help, and sends nothing', async () => {
    const { el, text } = await render();
    expect(el.querySelector('h2')?.textContent).toBe('Adicionar cartas');
    expect(el.querySelector('.field__helper')?.textContent).toBe('Mínimo de 3 caracteres.');
    expect(text()).toContain('Busque uma carta pelo nome');
    expect(catalog.calls).toEqual([]);
  });

  it('sends no request under 3 characters', async () => {
    const { type, text } = await render();
    await type('so');
    expect(catalog.calls).toEqual([]);
    expect(text()).toBe('Digite pelo menos 3 caracteres para buscar.');
  });

  it('debounces: only the last text is searched', async () => {
    const { input, fixture, settle } = await render();
    catalog.answers.push({ cards: [card(1)], hasMore: false });
    for (const value of ['sol', 'sol r', 'sol ring']) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 50);
    }
    expect(catalog.calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(50);
    fixture.detectChanges();
    await settle();
    expect(catalog.calls).toEqual([{ text: 'sol ring', page: 0 }]);
  });

  it('shows the loading placeholders, then the results as tiles named "nome — tipo"', async () => {
    const { type, el, text, live, tiles, settle, fixture } = await render();
    await type('sol');
    expect(el.querySelectorAll('.skeleton').length).toBe(10);
    expect(text()).toContain('Buscando…');
    catalog.pending[0].resolve({ cards: [card(1), card(2)], hasMore: false });
    await settle();
    fixture.detectChanges();
    expect(tiles().length).toBe(2);
    expect(tiles()[0].getAttribute('aria-label')).toBe('Card 1 — Artifact');
    expect(live()).toBe('2 cartas encontradas');
  });

  it('emits pick for the chosen result', async () => {
    const { type, tiles, picked } = await render();
    catalog.answers.push({ cards: [card(1), card(2)], hasMore: false });
    await type('sol');
    (tiles()[1] as HTMLButtonElement).click();
    expect(picked).toEqual([card(2)]);
  });

  it('ignores a stale answer', async () => {
    const { type, tiles, settle, fixture } = await render();
    await type('sol');
    await type('sol ring');
    catalog.pending[1].resolve({ cards: [card(2)], hasMore: false });
    await settle();
    catalog.pending[0].resolve({ cards: [card(1), card(3)], hasMore: false });
    await settle();
    fixture.detectChanges();
    expect(tiles().length).toBe(1);
    expect(tiles()[0].getAttribute('aria-label')).toBe('Card 2 — Artifact');
  });

  it('shows the empty state with the typed text', async () => {
    const { type, text } = await render();
    catalog.answers.push({ cards: [], hasMore: false });
    await type('zzzz');
    expect(text()).toContain('Nenhuma carta encontrada para “zzzz”.');
  });

  it('pages through the sentinel until there is no more', async () => {
    const { type, el, tiles, settle, fixture, live, text } = await render();
    catalog.answers.push({ cards: Array.from({ length: 100 }, (_, i) => card(i)), hasMore: true });
    await type('sol');
    expect(live()).toBe('Mais de 100 cartas encontradas — role para ver mais.');

    const sentinel = el.querySelector<HTMLElement>('.sentinel')!;
    intersect(sentinel, false);
    expect(catalog.calls.length).toBe(1);

    intersect(sentinel);
    fixture.detectChanges();
    expect(text()).toContain('Carregando mais…');
    expect(catalog.calls[1]).toEqual({ text: 'sol', page: 1 });
    // A second intersection while the page is in flight asks for nothing.
    intersect(sentinel);
    expect(catalog.calls.length).toBe(2);

    catalog.pending[0].resolve({ cards: [card(200), card(201)], hasMore: false });
    await settle();
    fixture.detectChanges();
    expect(tiles().length).toBe(102);
    intersect(el.querySelector<HTMLElement>('.sentinel')!);
    expect(catalog.calls.length).toBe(2);
  });

  it('keeps the results when the next page fails and retries it', async () => {
    const { type, el, tiles, settle, fixture, text } = await render();
    catalog.answers.push({ cards: Array.from({ length: 100 }, (_, i) => card(i)), hasMore: true });
    await type('sol');
    intersect(el.querySelector<HTMLElement>('.sentinel')!);
    catalog.pending[0].reject(new CatalogError('failed'));
    await settle();
    fixture.detectChanges();
    expect(tiles().length).toBe(100);
    expect(text()).toContain('Não foi possível carregar mais cartas.');

    // The sentinel does not retry by itself while the failure shows.
    intersect(el.querySelector<HTMLElement>('.sentinel')!);
    expect(catalog.calls.length).toBe(2);

    const retry = [...el.querySelectorAll<HTMLButtonElement>('.plate button')].find(
      (b) => b.textContent?.trim() === 'Tentar de novo',
    )!;
    retry.click();
    expect(catalog.calls[2]).toEqual({ text: 'sol', page: 1 });
    catalog.pending[1].resolve({ cards: [card(300)], hasMore: false });
    await settle();
    fixture.detectChanges();
    expect(tiles().length).toBe(101);
  });

  it.each([
    ['offline', 'Sem conexão.'],
    ['failed', 'Não foi possível acessar o catálogo agora.'],
  ] as const)('shows the %s plate and retries the same request', async (kind, message) => {
    const { type, el, text, tiles, settle, fixture } = await render();
    catalog.answers.push(new CatalogError(kind));
    await type('sol');
    expect(text()).toContain(message);

    catalog.answers.push({ cards: [card(1)], hasMore: false });
    el.querySelector<HTMLButtonElement>('.plate button')!.click();
    await settle();
    fixture.detectChanges();
    expect(catalog.calls).toEqual([
      { text: 'sol', page: 0 },
      { text: 'sol', page: 0 },
    ]);
    expect(tiles().length).toBe(1);
  });

  it('closes through the shell ✕', async () => {
    const { el, closes } = await render();
    el.querySelector<HTMLButtonElement>('.close')!.click();
    expect(closes()).toBe(1);
  });

  it('observes the sentinel against the results area', async () => {
    const { type, el } = await render();
    catalog.answers.push({ cards: [card(1)], hasMore: true });
    await type('sol');
    const sentinel = el.querySelector<HTMLElement>('.sentinel')!;
    const { observerRoots } = await import('@testing/intersection-observer');
    expect(observerRoots(sentinel)).toEqual([el.querySelector('.results')]);
  });
});

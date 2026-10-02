import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { CardEntry } from '@models/card.model';
import type { Collection, CollectionColorHex } from '@models/collection.model';
import { CardService } from '@services/card.service';
import { CardViewModeService } from '@services/card-view-mode.service';
import { CollectionService } from '@services/collection.service';
import { ToastService } from '@services/toast.service';
import { mockCardEntry } from '@testing/card.mocks';
import { stubDialog } from '@testing/dialog';
import { SWEEP_MS, SweepLoop } from '@shared/effects/page-sweep/sweep-loop';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectionMatcher } from '../../app.routes';
import { openProfileDb } from '@db/profile-db';
import { CollectionArea } from './collection-area';

interface Media {
  mobile?: boolean;
  wide?: boolean;
  reduced?: boolean;
}

function stubMedia({ mobile = false, wide = false, reduced = true }: Media = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches:
      (query.includes('reduce') && reduced) ||
      (query.includes('max-width: 640px') && mobile) ||
      (query.includes('min-width: 960px') && wide),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function col(id: string, name: string, parentId: string | null = null, color: CollectionColorHex = '#d8cdb0'): Collection {
  return { id, name, color, parentId, updatedAt: '2026-01-01T00:00:00.000Z' };
}

function card(id: string, locationId: string, quantity = 1, forSale = false): CardEntry {
  return mockCardEntry({ id, locationId, quantity, forSale });
}

async function seed(profileId: string, collections: Collection[], cards: CardEntry[] = []): Promise<void> {
  const db = await openProfileDb(profileId);
  const tx = db.transaction(['collections', 'cards'], 'readwrite');
  await Promise.all([
    ...collections.map((c) => tx.objectStore('collections').put(c)),
    ...cards.map((c) => tx.objectStore('cards').put(c)),
    tx.done,
  ]);
}

async function setUp(url: string, media: Media = {}) {
  stubMedia(media);
  TestBed.configureTestingModule({
    providers: [provideRouter([{ matcher: collectionMatcher, component: CollectionArea }], withComponentInputBinding())],
  });
  const cards = TestBed.inject(CardService);
  const collections = TestBed.inject(CollectionService);
  await cards.load('p1');
  await collections.load('p1');
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await settle(harness);
  const el = harness.routeNativeElement as HTMLElement;
  return { harness, el, router: TestBed.inject(Router), cards, collections };
}

async function settle(harness: RouterTestingHarness) {
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

const text = (el: Element | null) => el?.textContent?.trim() ?? '';
const rowNames = (el: HTMLElement) => [...el.querySelectorAll('app-collection-row .name')].map(text);
const inert = (el: HTMLElement) => el.querySelector('app-page-sweep')!.hasAttribute('inert');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A tree: Fichário (> Azuis > Lote 1, > Vermelhas), Caixa de trocas (cards), Álbum (empty).
const tree = [
  col('fich', 'Fichário', null, '#3d6b85'),
  col('azuis', 'Azuis', 'fich'),
  col('lote', 'Lote 1', 'azuis'),
  col('verm', 'vermelhas', 'fich'),
  col('trocas', 'Caixa de trocas', null, '#2e2a2a'),
  col('album', 'Álbum'),
];
const treeCards = [
  card('c1', 'lote', 3, true),
  card('c2', 'verm', 1000),
  card('c3', 'trocas', 1, false),
  card('c4', 'trocas', 239, true),
];

describe('CollectionArea', () => {
  afterEach(async () => {
    await TestBed.inject(CollectionService).flush();
    await TestBed.inject(CardService).flush();
    vi.unstubAllGlobals();
  });

  describe('list', () => {
    it('lists top-level collections in pt-BR order with rolled-up counts', async () => {
      await seed('p1', tree, treeCards);
      const { el } = await setUp('/collection');

      expect(text(el.querySelector('h1'))).toBe('Coleção');
      expect(rowNames(el)).toEqual(['Álbum', 'Caixa de trocas', 'Fichário']);
      const metas = [...el.querySelectorAll('app-collection-row .meta')].map(text);
      expect(metas).toEqual(['Vazia', '240 cartas · 239 à venda', '1.003 cartas · 3 à venda · 3 subcoleções']);
    });

    it('shows only the active profile’s cards on a collection page', async () => {
      await seed('p1', tree, [mockCardEntry({ id: 'mine', name: 'Minha', locationId: 'trocas' })]);
      await seed('p2', tree, [mockCardEntry({ id: 'theirs', name: 'Dela', locationId: 'trocas' })]);
      const { el, harness, collections, cards } = await setUp('/collection/trocas');
      const names = () => [...el.querySelectorAll('app-card-grid .tile')].map((t) => t.getAttribute('aria-label')!.split(',')[0]);
      expect(names()).toEqual(['Minha']);

      await cards.load('p2');
      await collections.load('p2');
      await settle(harness);
      expect(names()).toEqual(['Dela']);
    });

    it('shows only the active profile’s collections', async () => {
      await seed('p1', tree, treeCards);
      await seed('p2', [col('outra', 'Outra')]);
      const { el, harness, collections, cards } = await setUp('/collection');
      expect(rowNames(el)).toContain('Fichário');

      await cards.load('p2');
      await collections.load('p2');
      await settle(harness);
      expect(rowNames(el)).toEqual(['Outra']);
    });

    it('shows the empty state with no search, filters or aside', async () => {
      const { el } = await setUp('/collection', { wide: true });
      expect(text(el.querySelector('.empty-state .eyebrow'))).toBe('Nenhuma coleção ainda');
      expect(text(el.querySelector('h2'))).toBe('Onde suas cartas moram');
      expect(text(el.querySelector('.empty-state .btn--primary'))).toBe('Criar coleção');
      expect(el.querySelector('.search')).toBeNull();
      expect(el.querySelector('aside')).toBeNull();
      expect(el.querySelectorAll('h1')).toHaveLength(1);
    });

    it('puts filters in the aside at ≥ 960px and in a button below', async () => {
      await seed('p1', tree);
      const wide = await setUp('/collection', { wide: true });
      expect(wide.el.querySelector('aside .eyebrow')?.textContent).toBe('Filtros');
      expect(wide.el.querySelector('.filters-btn')).toBeNull();
      const search = wide.el.querySelector<HTMLInputElement>('.search')!;
      expect(search.disabled).toBe(true);
      expect(search.getAttribute('aria-label')).toBe('Buscar coleções (em breve)');
    });

    it('uses the Filtros button and no aside below 960px', async () => {
      await seed('p1', tree);
      const { el } = await setUp('/collection');
      expect(el.querySelector('aside')).toBeNull();
      expect(el.querySelector<HTMLButtonElement>('.filters-btn')?.disabled).toBe(true);
    });

    it('ends the list with a dashed create row on phone instead of the header button', async () => {
      await seed('p1', tree);
      const phone = await setUp('/collection', { mobile: true });
      expect(text(phone.el.querySelector('.rows > app-create-row'))).toContain('Nova coleção');
      expect(phone.el.querySelector('.header .btn--primary')).toBeNull();
    });
  });

  describe('collection page', () => {
    it('drills down to level 3 and back through the path links', async () => {
      await seed('p1', tree, treeCards);
      const { el, harness, router } = await setUp('/collection');

      el.querySelectorAll<HTMLButtonElement>('app-collection-row button')[2].click();
      await settle(harness);
      expect(router.url).toBe('/collection/fich');
      expect(text(el.querySelector('h1'))).toBe('Fichário');

      el.querySelector<HTMLButtonElement>('app-collection-row button')!.click();
      await settle(harness);
      el.querySelector<HTMLButtonElement>('app-collection-row button')!.click();
      await settle(harness);
      expect(router.url).toBe('/collection/lote');
      const path = el.querySelector('nav[aria-label="Caminho"]')!;
      expect([...path.querySelectorAll('a')].map(text)).toEqual(['Coleção', 'Fichário', 'Azuis']);
      expect(path.querySelector('[aria-current="page"]')?.textContent).toBe('Lote 1');

      path.querySelectorAll('a')[1].click();
      await settle(harness);
      expect(router.url).toBe('/collection/fich');
      el.querySelector<HTMLAnchorElement>('nav a')!.click();
      await settle(harness);
      expect(router.url).toBe('/collection');
    });

    it('shows the subtree summary and the subcollections of a parent, with no grid', async () => {
      await seed('p1', tree, treeCards);
      const { el } = await setUp('/collection/fich');
      expect(text(el.querySelector('.summary'))).toBe('1.003 cartas · 3 à venda');
      expect(text(el.querySelector('.main > .eyebrow'))).toBe('Subcoleções');
      expect(rowNames(el)).toEqual(['Azuis', 'vermelhas']);
      expect(text(el.querySelector('.rows app-create-row'))).toContain('Nova subcoleção');
      expect(el.querySelector('.choices')).toBeNull();
      expect(el.querySelector('app-card-grid')).toBeNull();
      expect(text(el)).not.toContain('Adicionar cartas');
    });

    it('lists the direct cards newest first, with the summary and the split row', async () => {
      const cardsHere = [
        mockCardEntry({ id: 'old', name: 'Antiga', locationId: 'verm', quantity: 4, addedAt: '2026-01-01T00:00:00.000Z' }),
        mockCardEntry({ id: 'new', name: 'Recente', locationId: 'verm', quantity: 6, forSale: true, addedAt: '2026-01-05T00:00:00.000Z' }),
        mockCardEntry({ id: 'other', name: 'De outra', locationId: 'trocas' }),
      ];
      await seed('p1', tree, cardsHere);
      const { el } = await setUp('/collection/verm');
      const names = [...el.querySelectorAll('app-card-grid .tile')].map((t) => t.getAttribute('aria-label')!.split(',')[0]);
      expect(names).toEqual(['Recente', 'Antiga']);
      expect(text(el.querySelector('.summary'))).toBe('10 cartas · 6 à venda');
      expect(text(el.querySelector('app-create-row'))).toContain('Dividir em subcoleções');
      expect(text(el.querySelector('app-create-row .sub'))).toBe('As 10 cartas vão para a primeira subcoleção.');
    });

    it('shows "Último nível" and no split row for a level-3 collection with cards', async () => {
      await seed('p1', tree, treeCards);
      const { el } = await setUp('/collection/lote');
      expect(el.querySelector('app-create-row')).toBeNull();
      expect([...el.querySelectorAll('.meta')].map(text)).toContain('Último nível: esta coleção só guarda cartas.');
    });

    it('offers both choices for an empty level-1 collection', async () => {
      await seed('p1', tree, treeCards);
      const { el } = await setUp('/collection/album');
      const choices = el.querySelectorAll('.choice');
      expect(choices).toHaveLength(2);
      expect(text(choices[0].querySelector('.btn--primary'))).toBe('Adicionar cartas');
      expect(text(choices[1].querySelector('.btn--secondary'))).toBe('Nova subcoleção');
      expect([...el.querySelectorAll('.meta')].map(text)).toContain(
        'Uma coleção guarda cartas ou subcoleções — nunca os dois.',
      );
      expect(el.querySelector('app-card-grid')).toBeNull();
    });

    it('hides "Dividir" for an empty level-3 collection', async () => {
      await seed('p1', [...tree, col('vazio', 'Vazio', 'azuis')], treeCards);
      const { el } = await setUp('/collection/vazio');
      expect(el.querySelectorAll('.choice')).toHaveLength(1);
      expect([...el.querySelectorAll('.meta')].map(text)).toContain('Último nível: esta coleção só guarda cartas.');
    });

    describe('display toggle', () => {
      afterEach(() => localStorage.clear());

      it('switches the grid between details and images and keeps the choice', async () => {
        await seed('p1', tree, treeCards);
        const { el, harness } = await setUp('/collection/trocas');
        const toggle = () => [...el.querySelectorAll<HTMLButtonElement>('app-card-view-toggle [role="radio"]')];
        expect(el.querySelector('.grid')!.classList.contains('is-details')).toBe(true);
        expect(toggle().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true']);

        toggle()[0].click();
        await settle(harness);
        expect(el.querySelector('.grid')!.classList.contains('is-images')).toBe(true);
        expect(TestBed.inject(CardViewModeService).mode()).toBe('images');
        expect(localStorage.getItem('grm-card-view:')).toBe('images');
      });

      it('reads the stored choice again after a reload', async () => {
        localStorage.setItem('grm-card-view:', 'images');
        await seed('p1', tree, treeCards);
        const { el } = await setUp('/collection/trocas');
        expect(el.querySelector('.grid')!.classList.contains('is-images')).toBe(true);
      });
    });

    it('redirects an unknown id to the list, with no sweep', async () => {
      await seed('p1', tree);
      const navigate = vi.spyOn(Router.prototype, 'navigate');
      const { router, el } = await setUp('/collection/nope');
      expect(router.url).toBe('/collection');
      expect(navigate).toHaveBeenCalledWith(['/collection'], { replaceUrl: true, info: { sweep: false } });
      expect(text(el.querySelector('h1'))).toBe('Coleção');
      navigate.mockRestore();
    });

    it('redirects when a sync removes the open collection', async () => {
      await seed('p1', tree);
      const { router, harness, collections } = await setUp('/collection/album');
      collections.applySyncResult(collections.collections().filter((c) => c.id !== 'album'));
      await settle(harness);
      expect(router.url).toBe('/collection');
    });

    it('focuses the new h1 after a navigation', async () => {
      await seed('p1', tree);
      const { el, harness } = await setUp('/collection');
      el.querySelector<HTMLButtonElement>('app-collection-row button')!.click();
      await settle(harness);
      expect(document.activeElement).toBe(el.querySelector('h1'));
      expect(text(el.querySelector('h1'))).toBe('Álbum');
    });
  });

  describe('create and edit', () => {
    let restore: () => void;
    beforeEach(() => (restore = stubDialog()));
    afterEach(async () => {
      await TestBed.inject(CollectionService).flush();
      await TestBed.inject(CardService).flush();
      // Destroying closes the dialog, so it must happen while the stubs are still in place.
      TestBed.resetTestingModule();
      restore();
    });

    async function fillAndSubmit(harness: RouterTestingHarness, el: HTMLElement, name: string) {
      await settle(harness);
      const input = el.querySelector<HTMLInputElement>('app-collection-form-dialog .field__input')!;
      input.value = name;
      input.dispatchEvent(new Event('input'));
      el.querySelector('app-collection-form-dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(harness);
    }

    it('creates from the empty state, then shows the new collection in the list', async () => {
      const { el, harness, router } = await setUp('/collection');
      el.querySelector<HTMLButtonElement>('.empty-state .btn--primary')!.click();
      await fillAndSubmit(harness, el, 'Fichário vermelho');
      expect(el.querySelector('app-collection-form-dialog')).toBeNull();
      expect(router.url).toBe('/collection');
      expect(rowNames(el)).toEqual(['Fichário vermelho']);
      expect(text(el.querySelector('app-collection-row .meta'))).toBe('Vazia');
    });

    it('creates from the header button and sorts the new row in', async () => {
      await seed('p1', tree);
      const { el, harness } = await setUp('/collection');
      el.querySelector<HTMLButtonElement>('.header .btn--primary')!.click();
      await fillAndSubmit(harness, el, 'Baralhos');
      expect(rowNames(el)).toEqual(['Álbum', 'Baralhos', 'Caixa de trocas', 'Fichário']);
    });

    it('creates from the dashed row on phone', async () => {
      await seed('p1', tree);
      const { el, harness } = await setUp('/collection', { mobile: true });
      el.querySelector<HTMLButtonElement>('.rows > app-create-row button')!.click();
      await fillAndSubmit(harness, el, 'Zeta');
      expect(rowNames(el).at(-1)).toBe('Zeta');
    });

    it('opens a new subcollection from each entry point, with the page as parent', async () => {
      await seed('p1', tree, treeCards);
      const cases: [url: string, selector: string][] = [
        ['/collection/fich', '.rows > app-create-row button'],
        ['/collection/verm', 'app-create-row button'],
        ['/collection/album', '.choice .btn--secondary'],
      ];
      for (const [url, selector] of cases) {
        const { el, harness } = await setUp(url);
        el.querySelector<HTMLButtonElement>(selector)!.click();
        await settle(harness);
        expect(text(el.querySelector('app-collection-form-dialog h2'))).toBe('Nova subcoleção');
        TestBed.resetTestingModule();
      }
    });

    it('offers no subcollection action at level 3, and no card action on a parent', async () => {
      await seed('p1', [...tree, col('vazio', 'Vazio', 'azuis')], treeCards);
      for (const url of ['/collection/lote', '/collection/vazio']) {
        const { el } = await setUp(url);
        expect(el.querySelector('app-create-row')).toBeNull();
        expect(el.querySelector('.choice .btn--secondary')).toBeNull();
        TestBed.resetTestingModule();
      }
      const { el } = await setUp('/collection/fich');
      expect(el.querySelector('.choices')).toBeNull();
      expect(text(el)).not.toContain('Adicionar cartas');
    });

    it('splits a collection with cards: the new subcollection takes them, the totals stay', async () => {
      await seed('p1', tree, treeCards);
      const { el, harness, router } = await setUp('/collection/trocas');
      el.querySelector<HTMLButtonElement>('app-create-row button')!.click();
      await settle(harness);
      expect(text(el.querySelector('app-collection-form-dialog .plate'))).toContain('Caixa de trocas tem 240 cartas.');
      expect(text(el.querySelector('app-collection-form-dialog .btn--primary'))).toBe('Criar e mover cartas');

      await fillAndSubmit(harness, el, 'Para troca');
      expect(router.url).toBe('/collection/trocas');
      expect(text(el.querySelector('.main > .eyebrow'))).toBe('Subcoleções');
      expect(rowNames(el)).toEqual(['Para troca']);
      expect(text(el.querySelector('app-collection-row .meta'))).toBe('240 cartas · 239 à venda');
      expect(text(el.querySelector('.summary'))).toBe('240 cartas · 239 à venda');
    });

    it('edits from the collection page and updates the header and path', async () => {
      await seed('p1', tree);
      const { el, harness, router } = await setUp('/collection/azuis');
      const edit = [...el.querySelectorAll<HTMLButtonElement>('.header-actions .btn')].find(
        (b) => text(b) === 'Editar',
      )!;
      edit.click();
      await settle(harness);
      expect(text(el.querySelector('app-collection-form-dialog h2'))).toBe('Editar subcoleção');
      await fillAndSubmit(harness, el, 'Azuis e verdes');
      expect(router.url).toBe('/collection/azuis');
      expect(text(el.querySelector('h1'))).toBe('Azuis e verdes');
      expect(el.querySelector('[aria-current="page"]')?.textContent).toBe('Azuis e verdes');
    });
  });

  describe('delete', () => {
    let restore: () => void;
    beforeEach(() => (restore = stubDialog()));
    afterEach(async () => {
      await TestBed.inject(CollectionService).flush();
      await TestBed.inject(CardService).flush();
      TestBed.resetTestingModule();
      restore();
    });

    async function deleteCurrent(harness: RouterTestingHarness, el: HTMLElement, choice?: 'move' | 'delete') {
      el.querySelector<HTMLButtonElement>('.header-actions .btn--danger')!.click();
      await settle(harness);
      if (choice) {
        el.querySelector<HTMLButtonElement>(`[data-choice="${choice}"]`)!.click();
        await settle(harness);
      }
      el.querySelector<HTMLButtonElement>('app-collection-delete-dialog .btn--danger')!.click();
      await settle(harness);
      await TestBed.inject(CollectionService).flush();
      await settle(harness);
    }

    it('moves the cards to the holding box and lands on the parent', async () => {
      await seed('p1', tree, treeCards);
      const { el, harness, router } = await setUp('/collection/azuis');
      const urls: string[] = [];
      router.events.subscribe((e) => {
        if (e instanceof NavigationEnd) urls.push(e.urlAfterRedirects);
      });

      await deleteCurrent(harness, el, 'move');
      expect(el.querySelector('app-collection-delete-dialog')).toBeNull();
      expect(router.url).toBe('/collection/fich');
      expect(urls).toEqual(['/collection/fich']);
      expect(TestBed.inject(ToastService).toast()).toMatchObject({
        label: 'Coleção',
        text: 'Azuis foi excluída. 3 cartas foram para a caixa temporária.',
      });
      expect(TestBed.inject(CollectionService).stats().holding.cards).toBe(3);
    });

    it('deletes the cards too, with its toast', async () => {
      await seed('p1', tree, treeCards);
      const { el, harness } = await setUp('/collection/verm');
      await deleteCurrent(harness, el, 'delete');
      expect(TestBed.inject(ToastService).toast()?.text).toBe('vermelhas e 1.000 cartas foram excluídas.');
      expect(TestBed.inject(CardService).cards().map((c) => c.id)).not.toContain('c2');
    });

    it('stays on the list after deleting an empty top-level collection from its page', async () => {
      await seed('p1', tree, treeCards);
      const { el, harness, router } = await setUp('/collection/album');
      await deleteCurrent(harness, el);
      expect(router.url).toBe('/collection');
      expect(TestBed.inject(ToastService).toast()?.text).toBe('Álbum foi excluída.');
      expect(rowNames(el)).toEqual(['Caixa de trocas', 'Fichário']);
    });

    it('leaves the parent empty after deleting its last subcollection', async () => {
      await seed('p1', [col('top', 'Topo'), col('only', 'Única', 'top')]);
      const { el, harness, router } = await setUp('/collection/only');
      await deleteCurrent(harness, el);
      expect(router.url).toBe('/collection/top');
      expect(el.querySelectorAll('.choice')).toHaveLength(2);
    });
  });

  describe('holding box', () => {
    it('shows no tag while every card has a collection', async () => {
      await seed('p1', tree, treeCards);
      const { el } = await setUp('/collection');
      expect(el.querySelector('.holding-tag')).toBeNull();
    });

    it('shows the tag with its count and opens the holding page', async () => {
      await seed('p1', tree, [...treeCards, card('h1', 'gone', 30, true), card('h2', 'gone2', 7)]);
      const { el, harness, router } = await setUp('/collection');
      const tag = el.querySelector<HTMLButtonElement>('.holding-tag')!;
      expect(tag.getAttribute('aria-label')).toBe('Caixa temporária. 37 cartas sem coleção, 30 à venda.');
      expect(text(tag.querySelector('.holding-count'))).toBe('37 cartas');

      tag.click();
      await settle(harness);
      expect(router.url).toBe('/collection/caixa');
      expect(text(el.querySelector('h1'))).toBe('Caixa temporária');
      const path = el.querySelector('nav[aria-label="Caminho"]')!;
      expect(text(path.querySelector('a'))).toBe('Coleção');
      expect(path.querySelector('[aria-current="page"]')?.textContent).toBe('Caixa temporária');
      expect(text(el.querySelector('.summary'))).toBe('37 cartas · 30 à venda');
      expect(el.querySelector('.header-actions')).toBeNull();
    });

    it('shows a read-only grid of the holding cards, newest first, with no add action', async () => {
      const held = [
        mockCardEntry({ id: 'h1', name: 'Velha', locationId: 'gone', addedAt: '2026-01-01T00:00:00.000Z' }),
        mockCardEntry({ id: 'h2', name: 'Nova', locationId: 'gone2', addedAt: '2026-01-09T00:00:00.000Z' }),
      ];
      await seed('p1', tree, [...treeCards, ...held]);
      const { el } = await setUp('/collection/caixa');
      const tiles = [...el.querySelectorAll('app-card-grid .tile')];
      expect(tiles.map((t) => t.getAttribute('aria-label')!.split(',')[0])).toEqual(['Nova', 'Velha']);
      expect(el.querySelectorAll('app-card-grid button.tile')).toHaveLength(0);
      expect(tiles[0].getAttribute('role')).toBe('img');
      expect(text(el.querySelector('.holding-copy'))).toBe(
        'Cartas sem lugar definido. Aqui só dá para ver — sem adicionar nem editar.',
      );
      expect(text(el)).not.toContain('Adicionar cartas');
      expect(el.querySelector('app-card-view-toggle')).not.toBeNull();
    });

    it('lists (not the empty state) when only the holding box has cards', async () => {
      await seed('p1', [], [card('h1', 'gone')]);
      const { el } = await setUp('/collection');
      expect(el.querySelector('.empty-state')).toBeNull();
      expect(text(el.querySelector('.holding-tag .holding-count'))).toBe('1 carta');
    });

    it('redirects an empty holding box to the list', async () => {
      await seed('p1', tree, treeCards);
      const { router } = await setUp('/collection/caixa');
      expect(router.url).toBe('/collection');
    });

    it('hides the tag and leaves the page once the last holding card is gone', async () => {
      await seed('p1', tree, [card('h1', 'gone')]);
      const { harness, router, cards } = await setUp('/collection/caixa');
      expect(router.url).toBe('/collection/caixa');
      cards.applySyncResult([]);
      await settle(harness);
      expect(router.url).toBe('/collection');
      expect(harness.routeNativeElement!.querySelector('.holding-tag')).toBeNull();
    });
  });

  describe('page change', () => {
    it('swaps instantly under reduced motion, with no sweep layer and no canvas', async () => {
      await seed('p1', tree);
      const { el, harness } = await setUp('/collection');
      el.querySelector<HTMLButtonElement>('app-collection-row button')!.click();
      await settle(harness);
      expect(text(el.querySelector('h1'))).toBe('Álbum');
      expect(el.querySelector('.sweep')).toBeNull();
      expect(el.querySelector('canvas.dust')).toBeNull();
    });

    it('sweeps the outgoing page over the incoming one, inert while it runs', async () => {
      await seed('p1', tree);
      const { el, harness } = await setUp('/collection', { reduced: false });
      el.querySelector<HTMLButtonElement>('app-collection-row button')!.click();
      await settle(harness);
      expect(inert(el)).toBe(true);
      expect(el.querySelector('canvas.dust')).not.toBeNull();
      expect(text(el.querySelector('.sweep h1'))).toBe('Coleção');

      await wait(SWEEP_MS + 100);
      await settle(harness);
      expect(inert(el)).toBe(false);
      expect(el.querySelector('.sweep')).toBeNull();
      expect(text(el.querySelector('h1'))).toBe('Álbum');
    });

    it('keeps a collection removed mid-sweep whole as it dissolves', async () => {
      await seed('p1', tree, treeCards);
      const { el, harness, router, collections } = await setUp('/collection/trocas', { reduced: false });
      await router.navigate(['/collection']);
      await settle(harness);
      expect(el.querySelector('.sweep.sweep--close')).not.toBeNull();
      expect(text(el.querySelector('.sweep h1'))).toBe('Caixa de trocas');

      collections.applySyncResult(collections.collections().filter((c) => c.id !== 'trocas'));
      await settle(harness);
      expect(text(el.querySelector('.sweep h1'))).toBe('Caixa de trocas');
      expect(text(el.querySelector('.sweep .summary'))).toBe('240 cartas · 239 à venda');
      expect(el.querySelectorAll('.sweep app-card-tile')).toHaveLength(2);
    });

    it('finishes a sweep cut short by a redirect at once, settling its dust', async () => {
      await seed('p1', tree);
      const settleDust = vi.spyOn(SweepLoop.prototype, 'settle');
      const { el, harness, router } = await setUp('/collection', { reduced: false });
      el.querySelector<HTMLButtonElement>('app-collection-row button')!.click();
      await settle(harness);
      expect(el.querySelector('.sweep')).not.toBeNull();

      await router.navigate(['/collection', 'nope']);
      await settle(harness);
      await settle(harness);
      expect(router.url).toBe('/collection');
      expect(el.querySelector('.sweep')).toBeNull();
      expect(inert(el)).toBe(false);
      expect(text(el.querySelector('h1'))).toBe('Coleção');
      expect(settleDust).toHaveBeenCalled();
      settleDust.mockRestore();
    });

    it('still sweeps the next move after a redirect back to the same place', async () => {
      await seed('p1', tree, treeCards);
      const { el, harness, router } = await setUp('/collection', { reduced: false });
      await router.navigate(['/collection', 'caixa']);
      await settle(harness);
      expect(router.url).toBe('/collection');

      el.querySelector<HTMLButtonElement>('app-collection-row button')!.click();
      await settle(harness);
      expect(el.querySelector('.sweep')).not.toBeNull();
    });
  });
});

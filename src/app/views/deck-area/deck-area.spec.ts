import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Deck } from '@models/deck.model';
import { DeckService } from '@services/deck.service';
import { ToastService } from '@services/toast.service';
import { stubDialog } from '@testing/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deckMatcher } from '../../app.routes';
import { DeckArea } from './deck-area';
import { SWEEP_MS } from '@shared/effects/page-sweep/page-sweep.service';

interface Media {
  mobile?: boolean;
  reduced?: boolean;
}

function stubMedia({ mobile = false, reduced = true }: Media = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: (query.includes('reduce') && reduced) || (query.includes('max-width: 640px') && mobile),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function stubCanvas() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    setTransform: () => undefined,
    clearRect: () => undefined,
    drawImage: () => undefined,
    fillRect: () => undefined,
    createRadialGradient: () => ({ addColorStop: () => undefined }),
  } as never);
}

async function setUp(url: string, names: string[] = [], media: Media = {}) {
  stubMedia(media);
  stubCanvas();
  TestBed.configureTestingModule({
    providers: [provideRouter([{ matcher: deckMatcher, component: DeckArea }], withComponentInputBinding())],
  });
  const decks = TestBed.inject(DeckService);
  await decks.load('p1');
  const created: Deck[] = names.map((name) => {
    const result = decks.create({ name, format: 'commander' });
    if (!result.ok) throw new Error(result.error);
    return result.deck;
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url.replace(':first', created[0]?.id ?? ''));
  await settle(harness);
  const el = harness.routeNativeElement as HTMLElement;
  return { harness, el, router: TestBed.inject(Router), decks, created };
}

async function settle(harness: RouterTestingHarness) {
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

const text = (el: Element | null) => el?.textContent?.trim() ?? '';

describe('DeckArea', () => {
  afterEach(async () => {
    await TestBed.inject(DeckService).flush();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists the decks as tiles in alphabetical order', async () => {
    const { el } = await setUp('/decks', ['zur', 'Élesh', 'Atraxa']);

    expect([...el.querySelectorAll('app-deck-tile .name')].map(text)).toEqual(['Atraxa', 'Élesh', 'zur']);
    expect(text(el.querySelector('h1'))).toBe('Decks');
  });

  it('shows the empty state with no header button and no create row', async () => {
    const { el } = await setUp('/decks', [], { mobile: true });

    expect(text(el.querySelector('.empty-state h2'))).toBe('Sleevados e prontos pra jogar');
    expect(el.querySelector('.header .btn')).toBeNull();
    expect(el.querySelector('app-create-row')).toBeNull();
  });

  it('shows the create row instead of the header button on phone', async () => {
    const { el } = await setUp('/decks', ['Elfos'], { mobile: true });

    expect(el.querySelector('.header .btn')).toBeNull();
    expect(el.querySelector('app-create-row')).not.toBeNull();
  });

  it('shows only the header on a deck page', async () => {
    const { el } = await setUp('/decks/:first', ['Krenko goblins']);

    expect(text(el.querySelector('h1'))).toBe('Krenko goblins');
    expect(text(el.querySelector('.format'))).toBe('Commander');
    expect(text(el.querySelector('.back'))).toBe('Voltar para decks');
    expect(el.querySelector('.grid')).toBeNull();
    expect(el.querySelector('.column--deck')!.children).toHaveLength(2);
  });

  it('redirects an unknown deck to the list, replacing the address', async () => {
    stubMedia();
    const navigate = vi.spyOn(Router.prototype, 'navigate');
    const { harness, router } = await setUp('/decks/missing');
    await settle(harness);

    expect(navigate).toHaveBeenCalledWith(['/decks'], { replaceUrl: true });
    expect(router.url).toBe('/decks');
  });

  it('turns the page from a tile, inert while it runs', async () => {
    const { el, harness } = await setUp('/decks', ['Elfos'], { reduced: false });
    el.querySelector<HTMLAnchorElement>('app-deck-tile a')!.click();
    await settle(harness);

    expect(el.hasAttribute('inert')).toBe(true);
    expect(el.querySelector('.sweep')).not.toBeNull();
    expect(el.querySelector('canvas.dust')).not.toBeNull();
    expect(text(el.querySelector('.column--deck h1'))).toBe('Elfos');

    await new Promise((resolve) => setTimeout(resolve, SWEEP_MS + 100));
    await settle(harness);
    expect(el.hasAttribute('inert')).toBe(false);
    expect(el.querySelector('.sweep')).toBeNull();
    expect(text(el.querySelector('h1'))).toBe('Elfos');
  });

  it('swaps instantly under reduced motion, with no sweep layer and no canvas', async () => {
    const { el, harness } = await setUp('/decks', ['Elfos']);
    el.querySelector<HTMLAnchorElement>('app-deck-tile a')!.click();
    await settle(harness);

    expect(el.querySelector('.sweep')).toBeNull();
    expect(el.querySelector('canvas')).toBeNull();
    expect(text(el.querySelector('h1'))).toBe('Elfos');
  });

  describe('create and edit', () => {
    let restore: () => void;
    beforeEach(() => (restore = stubDialog()));
    afterEach(() => restore());

    it('creates the first deck from the empty state and stays on the list', async () => {
      const { el, harness, router } = await setUp('/decks');
      el.querySelector<HTMLButtonElement>('.empty-state .btn')!.click();
      await settle(harness);

      const input = el.querySelector<HTMLInputElement>('app-deck-form-dialog .field__input')!;
      input.value = 'Krenko goblins';
      input.dispatchEvent(new Event('input'));
      el.querySelector('app-deck-form-dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(harness);

      expect(el.querySelector('app-deck-form-dialog')).toBeNull();
      expect([...el.querySelectorAll('app-deck-tile .name')].map(text)).toEqual(['Krenko goblins']);
      expect(router.url).toBe('/decks');
    });

    it('edits the deck from its page and updates the header', async () => {
      const { el, harness, router, created } = await setUp('/decks/:first', ['Elfos']);
      el.querySelector<HTMLButtonElement>('.header-actions .btn--secondary')!.click();
      await settle(harness);

      const input = el.querySelector<HTMLInputElement>('app-deck-form-dialog .field__input')!;
      input.value = 'Elfos do Legacy';
      input.dispatchEvent(new Event('input'));
      el.querySelectorAll<HTMLButtonElement>('app-deck-form-dialog [role="radio"]')[5].click();
      el.querySelector('app-deck-form-dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(harness);

      expect(el.querySelector('app-deck-form-dialog')).toBeNull();
      expect(text(el.querySelector('h1'))).toBe('Elfos do Legacy');
      expect(text(el.querySelector('.format'))).toBe('Legacy');
      expect(router.url).toBe(`/decks/${created[0].id}`);
    });
  });

  describe('delete', () => {
    let restore: () => void;
    beforeEach(() => (restore = stubDialog()));
    afterEach(() => restore());

    it('lands on the list through one navigation, with no turn, and toasts', async () => {
      const { el, harness, router, decks } = await setUp('/decks/:first', ['Elfos', 'Goblins'], { reduced: false });
      const navigate = vi.spyOn(router, 'navigate');
      el.querySelector<HTMLButtonElement>('.header-actions .btn--danger')!.click();
      await settle(harness);
      el.querySelector<HTMLButtonElement>('app-deck-delete-dialog .btn--danger')!.click();
      harness.detectChanges();

      // Pending: the deck left the signal, but the header keeps its name and format.
      expect(decks.decks().map((d) => d.name)).toEqual(['Goblins']);
      expect(text(el.querySelector('h1'))).toBe('Elfos');
      expect(text(el.querySelector('.format'))).toBe('Commander');

      await decks.flush();
      await settle(harness);
      await settle(harness);

      expect(router.url).toBe('/decks');
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(['/decks'], { info: { deckTurn: false } });
      expect(el.querySelector('.sweep')).toBeNull();
      expect(el.hasAttribute('inert')).toBe(false);
      expect(el.querySelector('app-deck-delete-dialog')).toBeNull();
      expect(TestBed.inject(ToastService).toast()).toMatchObject({ label: 'Deck', text: 'Elfos foi excluído.' });
    });

    it('keeps the deck on cancel', async () => {
      const { el, harness, decks, router, created } = await setUp('/decks/:first', ['Elfos']);
      el.querySelector<HTMLButtonElement>('.header-actions .btn--danger')!.click();
      await settle(harness);
      el.querySelector<HTMLButtonElement>('app-deck-delete-dialog .btn--ghost')!.click();
      await settle(harness);

      expect(el.querySelector('app-deck-delete-dialog')).toBeNull();
      expect(decks.byId().has(created[0].id)).toBe(true);
      expect(router.url).toBe(`/decks/${created[0].id}`);
    });
  });

  it('focuses the heading after a swap', async () => {
    const { el, harness, router } = await setUp('/decks/:first', ['Elfos']);
    await router.navigate(['/decks']);
    await settle(harness);

    expect(document.activeElement).toBe(el.querySelector('h1'));
    expect(text(el.querySelector('h1'))).toBe('Decks');
  });
});

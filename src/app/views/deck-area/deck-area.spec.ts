import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Deck } from '@models/deck.model';
import { DeckService } from '@services/deck.service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deckMatcher } from '../../app.routes';
import { DeckArea } from './deck-area';
import { TURN_MS } from './deck-turn';

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
    expect(el.querySelector('.page')).not.toBeNull();
    expect(el.querySelector('canvas.dust')).not.toBeNull();
    expect(text(el.querySelector('.column--deck h1'))).toBe('Elfos');

    await new Promise((resolve) => setTimeout(resolve, TURN_MS + 50));
    await settle(harness);
    expect(el.hasAttribute('inert')).toBe(false);
    expect(el.querySelector('.page')).toBeNull();
    expect(text(el.querySelector('h1'))).toBe('Elfos');
  });

  it('swaps instantly under reduced motion, with no page layer and no canvas', async () => {
    const { el, harness } = await setUp('/decks', ['Elfos']);
    el.querySelector<HTMLAnchorElement>('app-deck-tile a')!.click();
    await settle(harness);

    expect(el.querySelector('.page')).toBeNull();
    expect(el.querySelector('canvas')).toBeNull();
    expect(text(el.querySelector('h1'))).toBe('Elfos');
  });

  it('focuses the heading after a swap', async () => {
    const { el, harness, router } = await setUp('/decks/:first', ['Elfos']);
    await router.navigate(['/decks']);
    await settle(harness);

    expect(document.activeElement).toBe(el.querySelector('h1'));
    expect(text(el.querySelector('h1'))).toBe('Decks');
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REDUCED_MOTION_QUERY } from '@shared/ds/media-query';
import type { DeckNav } from '@utils/deck-turn.util';
import { DeckTurn, TURN_MS } from './deck-turn';

const list = { kind: 'list' } as const;
const deck = { kind: 'deck', id: 'd1' } as const;
const tile: DeckNav = { trigger: 'imperative', info: { deckTurn: true } };
const backLink: DeckNav = { trigger: 'imperative' };

function fakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
  };
}

function stubReducedMotion(on: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: on && query === REDUCED_MOTION_QUERY,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

describe('DeckTurn', () => {
  let ctx: ReturnType<typeof fakeContext>;

  function create(): DeckTurn {
    TestBed.configureTestingModule({ providers: [provideRouter([]), DeckTurn] });
    return TestBed.inject(DeckTurn);
  }

  function attach(turn: DeckTurn): void {
    const host = document.createElement('div');
    const canvas = document.createElement('canvas');
    host.append(canvas);
    turn.attachCanvas(canvas, host);
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the first place instantly', () => {
    const turn = create();
    turn.go(deck, tile);

    expect(turn.shown()).toEqual(deck);
    expect(turn.turning()).toBeNull();
  });

  it('opens from a tile, renders the deck underneath, and clears after the turn', () => {
    const turn = create();
    turn.go(list, null);
    turn.go(deck, tile);

    expect(turn.turning()).toBe('open');
    expect(turn.shown()).toEqual(deck);
    vi.advanceTimersByTime(TURN_MS - 1);
    expect(turn.turning()).toBe('open');
    vi.advanceTimersByTime(1);
    expect(turn.turning()).toBeNull();
  });

  it('keeps the deck shown during a close until the list lands', () => {
    const turn = create();
    turn.go(deck, null);
    turn.go(list, backLink);

    expect(turn.turning()).toBe('close');
    expect(turn.shown()).toEqual(deck);
    vi.advanceTimersByTime(TURN_MS);
    expect(turn.shown()).toEqual(list);
    expect(turn.turning()).toBeNull();
  });

  it('swaps instantly for a navigation that does not turn', () => {
    const turn = create();
    turn.go(deck, null);
    turn.go(list, { trigger: 'imperative', replaceUrl: true });

    expect(turn.shown()).toEqual(list);
    expect(turn.turning()).toBeNull();
  });

  it('swaps instantly under reduced motion', () => {
    stubReducedMotion(true);
    const turn = create();
    turn.go(list, null);
    turn.go(deck, tile);

    expect(turn.shown()).toEqual(deck);
    expect(turn.turning()).toBeNull();
  });

  it('finishes a running turn instantly when another starts', () => {
    const turn = create();
    turn.go(deck, null);
    turn.go(list, backLink);
    turn.go(deck, tile);

    expect(turn.turning()).toBe('open');
    expect(turn.shown()).toEqual(deck);
  });

  it('stops the dust loop and clears the canvas within 2 s of the page settling', () => {
    const turn = create();
    attach(turn);
    turn.go(list, null);
    turn.go(deck, tile);

    vi.advanceTimersByTime(TURN_MS + 2100);
    const draws = ctx.clearRect.mock.calls.length;
    vi.advanceTimersByTime(1000);

    expect(draws).toBeGreaterThan(0);
    expect(ctx.clearRect.mock.calls.length).toBe(draws);
  });

  it('cancels timers and the dust loop on destroy', () => {
    const turn = create();
    attach(turn);
    turn.go(list, null);
    turn.go(deck, tile);
    vi.advanceTimersByTime(100);

    TestBed.resetTestingModule();
    const draws = ctx.clearRect.mock.calls.length;
    vi.advanceTimersByTime(3000);

    expect(ctx.clearRect.mock.calls.length).toBe(draws);
    expect(turn.turning()).toBe('open');
  });
});

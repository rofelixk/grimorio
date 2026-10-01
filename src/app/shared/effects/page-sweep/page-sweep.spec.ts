import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageRule } from '@utils/page-change.util';
import { FRONT_BAND, SETTLE_MAX_MS } from '@utils/sweep-dust.util';
import { PageChange } from './page-change';
import { PagePlace } from './page-place';
import { PageSweep } from './page-sweep';
import { SWEEP_MS } from './sweep-loop';

/** Letters: later ones open, earlier ones close, 'x' always swaps instantly. */
const RULE: PageRule<string> = {
  initial: 'a',
  same: (a, b) => a === b,
  sweep: (from, to) => (to === 'x' ? null : to > from ? 'open' : 'close'),
};

const reduced = signal(false);

/** Fake rAF runs a frame every 16 ms. */
const FRAME = 16;
/** Elapsed time on the frame the front completes: the first frame at or past `SWEEP_MS`. */
const CROSSING = Math.ceil(SWEEP_MS / FRAME) * FRAME;
/** From a change to its end, at most: the first frame, then the crossing one. */
const FULL_SWEEP = FRAME + CROSSING;

@Component({
  imports: [PageSweep, PagePlace],
  template: `
    <main>
      <app-page-sweep [change]="pages">
        <ng-template [appPagePlace]="pages" let-place let-leaving="leaving">
          <h1 tabindex="-1" [attr.data-leaving]="leaving">{{ place }}</h1>
        </ng-template>
      </app-page-sweep>
    </main>
  `,
})
class Host {
  readonly pages = new PageChange<string>(RULE, reduced, () => null);
}

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

describe('PageSweep', () => {
  let ctx: ReturnType<typeof fakeContext>;
  let fixture: ComponentFixture<Host>;
  let pages: PageChange<string>;
  let sweepEl: HTMLElement;

  function mount(first = 'a'): void {
    fixture = TestBed.createComponent(Host);
    pages = fixture.componentInstance.pages;
    pages.go(first);
    fixture.detectChanges();
    sweepEl = fixture.nativeElement.querySelector('app-page-sweep');
  }

  function go(place: string): void {
    pages.go(place);
    fixture.detectChanges();
  }

  /** Advances fake time, then renders whatever the page change did meanwhile. */
  function advance(ms: number): void {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  }

  const layer = () => sweepEl.querySelector<HTMLElement>('.sweep');
  const front = () => parseFloat(layer()!.style.getPropertyValue('--front'));

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1200);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(800);
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    reduced.set(false);
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the shown place, and the leaving one in the layer only while a sweep runs', () => {
    mount();
    expect(layer()).toBeNull();
    expect(sweepEl.querySelector('h1')!.textContent).toBe('a');

    go('b');
    expect(layer()!.querySelector('h1')!.textContent).toBe('a');
    expect(layer()!.querySelector('h1')!.dataset['leaving']).toBe('true');
    expect(sweepEl.querySelector('h1')!.textContent).toBe('b');

    advance(FULL_SWEEP);
    expect(layer()).toBeNull();
  });

  it('keeps the incoming page’s element when a sweep starts', () => {
    mount();
    const before = sweepEl.querySelector('h1');
    go('b');

    expect(sweepEl.querySelector('h1')).toBe(before);
    expect(before!.textContent).toBe('b');
  });

  it('is inert only while a sweep runs', () => {
    mount();
    expect(sweepEl.hasAttribute('inert')).toBe(false);
    go('b');
    expect(sweepEl.hasAttribute('inert')).toBe(true);
    advance(FULL_SWEEP);
    expect(sweepEl.hasAttribute('inert')).toBe(false);
  });

  it('binds the band width from FRONT_BAND', () => {
    mount();
    go('b');
    expect(layer()!.style.getPropertyValue('--band')).toBe(`${FRONT_BAND}px`);
  });

  it('leaves from where the page was scrolled, the incoming one at the top', () => {
    mount();
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    let scroll = 300;
    Object.defineProperty(main, 'scrollTop', { get: () => scroll, set: (v: number) => (scroll = v), configurable: true });
    go('b');

    expect(layer()!.style.top).toBe('-300px');
    expect(scroll).toBe(0);
  });

  it('sweeps the front right → left on open, and back on close', () => {
    mount();
    go('b');
    advance(100);
    const early = front();
    advance(300);
    expect(front()).toBeLessThan(early);
    advance(SWEEP_MS);

    go('a');
    expect(layer()!.classList.contains('sweep--close')).toBe(true);
    advance(100);
    const closing = front();
    advance(300);
    expect(front()).toBeGreaterThan(closing);
  });

  it('ends the change on the frame the front completes, not before', () => {
    mount();
    const end = vi.spyOn(pages, 'end');
    go('b');

    // The first frame, then every frame up to the last one short of SWEEP_MS.
    advance(FRAME);
    advance(CROSSING - FRAME);
    expect(end).not.toHaveBeenCalled();
    expect(pages.leaving()).toBe('a');
    expect(sweepEl.hasAttribute('inert')).toBe(true);

    advance(FRAME);
    expect(end).toHaveBeenCalledTimes(1);
    expect(pages.leaving()).toBeNull();
    expect(pages.run()).toBeNull();
    expect(sweepEl.hasAttribute('inert')).toBe(false);
  });

  it('ends a change superseded mid-sweep once, for the second sweep only', () => {
    mount();
    const end = vi.spyOn(pages, 'end');
    go('b');
    advance(200);

    go('c');
    const second = pages.run();
    advance(FULL_SWEEP);
    expect(end).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledWith(second);

    advance(FULL_SWEEP);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('starts a quick second change with the reused layer whole, not at the last front', () => {
    mount();
    go('b');
    advance(200);
    const reused = layer();
    expect(reused!.style.getPropertyValue('--front')).not.toBe('');

    go('c');
    expect(layer()).toBe(reused);
    expect(reused!.style.getPropertyValue('--front')).toBe('');
  });

  it('stops the dust loop and clears the canvas within the settle window', () => {
    mount();
    go('b');
    advance(SWEEP_MS + SETTLE_MAX_MS + 100);
    const draws = ctx.clearRect.mock.calls.length;
    advance(1000);

    expect(draws).toBeGreaterThan(0);
    expect(ctx.clearRect.mock.calls.length).toBe(draws);
  });

  it('focuses the incoming h1 after a change, but not on the first place', () => {
    mount();
    expect(document.activeElement).not.toBe(sweepEl.querySelector('h1'));

    go('x');
    expect(document.activeElement).toBe(sweepEl.querySelector('h1'));
    expect(sweepEl.querySelector('h1')!.textContent).toBe('x');

    (document.activeElement as HTMLElement).blur();
    go('y');
    expect(document.activeElement).not.toBe(sweepEl.querySelector('h1'));
    advance(FULL_SWEEP);
    expect(document.activeElement).toBe(sweepEl.querySelector('h1'));
    expect(sweepEl.querySelector('h1')!.textContent).toBe('y');
  });

  it('has no canvas under reduced motion', () => {
    reduced.set(true);
    mount();
    expect(sweepEl.querySelector('canvas')).toBeNull();
    go('b');
    expect(layer()).toBeNull();
  });

  it('has the canvas, aria-hidden, when motion is allowed', () => {
    mount();
    expect(sweepEl.querySelector('canvas.dust')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('cancels the dust loop on destroy', () => {
    mount();
    const end = vi.spyOn(pages, 'end');
    go('b');
    advance(100);

    fixture.destroy();
    const draws = ctx.clearRect.mock.calls.length;
    vi.advanceTimersByTime(3000);

    expect(ctx.clearRect.mock.calls.length).toBe(draws);
    expect(end).not.toHaveBeenCalled();
  });

  describe('interrupted', () => {
    it('settles the dust at once when a change lands without a new sweep', () => {
      mount();
      go('b');
      advance(200);

      go('x');
      expect(layer()).toBeNull();
      expect(sweepEl.hasAttribute('inert')).toBe(false);

      // The dust fades over the following frames rather than vanishing at once…
      const drawn = ctx.drawImage.mock.calls.length;
      advance(100);
      expect(ctx.drawImage.mock.calls.length).toBeGreaterThan(drawn);

      // …and is cleared, the loop stopped, within the settle window of the interrupt.
      advance(SETTLE_MAX_MS - 100 + 20);
      const cleared = ctx.clearRect.mock.calls.length;
      advance(1000);
      expect(ctx.clearRect.mock.calls.length).toBe(cleared);
    });

    it('settles the dust when the change returns to the place already shown', () => {
      mount();
      go('b');
      advance(200);

      go('b');
      expect(layer()).toBeNull();
      advance(SETTLE_MAX_MS + 20);
      const cleared = ctx.clearRect.mock.calls.length;
      advance(1000);
      expect(ctx.clearRect.mock.calls.length).toBe(cleared);
    });

    it('restarts the dust and the front for a new sweep', () => {
      mount();
      go('b');
      advance(200);
      const cleared = ctx.clearRect.mock.calls.length;

      go('c');
      expect(ctx.clearRect.mock.calls.length).toBeGreaterThan(cleared);
      expect(layer()!.style.getPropertyValue('--front')).toBe('');
      expect(layer()!.querySelector('h1')!.textContent).toBe('b');
      advance(100);
      expect(front()).toBeLessThan(1200);
      advance(SWEEP_MS);
      expect(pages.run()).toBeNull();
    });

    it('still ends on time with no 2D context', () => {
      vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
      mount();
      go('b');
      advance(FULL_SWEEP);

      expect(pages.run()).toBeNull();
      expect(layer()).toBeNull();
    });
  });
});

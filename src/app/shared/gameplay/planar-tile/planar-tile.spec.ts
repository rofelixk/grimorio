import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanarImageService } from '@services/planar-image.service';
import { planarCard } from '@testing/planechase-fixtures';
import { pointerEvent } from '@testing/pointer-events';
import { PlanarTile } from './planar-tile';

describe('PlanarTile', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlanarTile],
      providers: [{ provide: PlanarImageService, useValue: { url: vi.fn().mockResolvedValue(null) } }],
    });
  });

  async function render(id: string, on: boolean) {
    const fixture = TestBed.createComponent(PlanarTile);
    fixture.componentRef.setInput('card', planarCard(id));
    fixture.componentRef.setInput('on', on);
    await fixture.whenStable();
    return { fixture, button: (fixture.nativeElement as HTMLElement).querySelector('button')! };
  }

  it('names a plane and reports it on', async () => {
    const { button } = await render('p01', true);
    expect(button.getAttribute('aria-label')).toBe('Card P01, plano');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList).not.toContain('is-off');
  });

  it('names a phenomenon and reports it off', async () => {
    const { button } = await render('f01', false);
    expect(button.getAttribute('aria-label')).toBe('Card F01, fenômeno');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.classList).toContain('is-off');
  });

  it('shows the name while there is no image, and emits toggle on click', async () => {
    const { fixture, button } = await render('p02', true);
    expect(button.querySelector('.name')!.textContent).toBe('Card P02');
    const toggle = vi.fn();
    fixture.componentInstance.toggled.subscribe(toggle);
    button.click();
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  async function renderSpied(id = 'p01') {
    const rendered = await render(id, true);
    const tile = rendered.fixture.componentInstance;
    const spies = { toggled: vi.fn(), hoverStart: vi.fn(), hoverEnd: vi.fn(), previewRequested: vi.fn() };
    tile.toggled.subscribe(spies.toggled);
    tile.hoverStart.subscribe(spies.hoverStart);
    tile.hoverEnd.subscribe(spies.hoverEnd);
    tile.previewRequested.subscribe(spies.previewRequested);
    return { ...rendered, ...spies };
  }

  describe('hover', () => {
    it('reports a mouse or pen entering and leaving, with the button', async () => {
      const { button, hoverStart, hoverEnd } = await renderSpied();
      button.dispatchEvent(pointerEvent('pointerenter', { pointerType: 'mouse' }));
      button.dispatchEvent(pointerEvent('pointerleave', { pointerType: 'mouse' }));
      button.dispatchEvent(pointerEvent('pointerenter', { pointerType: 'pen' }));
      expect(hoverStart).toHaveBeenCalledTimes(2);
      expect(hoverStart).toHaveBeenCalledWith(button);
      expect(hoverEnd).toHaveBeenCalledTimes(1);
    });

    it('ignores touch', async () => {
      const { button, hoverStart, hoverEnd } = await renderSpied();
      button.dispatchEvent(pointerEvent('pointerenter', { pointerType: 'touch' }));
      button.dispatchEvent(pointerEvent('pointerleave', { pointerType: 'touch' }));
      expect(hoverStart).not.toHaveBeenCalled();
      expect(hoverEnd).not.toHaveBeenCalled();
    });

    it('keeps the hover look while previewing', async () => {
      const { fixture, button } = await render('p01', true);
      fixture.componentRef.setInput('previewing', true);
      await fixture.whenStable();
      expect(button.classList).toContain('is-previewing');
    });
  });

  describe('long-press', () => {
    afterEach(() => vi.useRealTimers());

    // Fake timers only once rendered: `whenStable` waits on real ones.
    async function renderHeld() {
      const rendered = await renderSpied();
      vi.useFakeTimers();
      return rendered;
    }

    const down = (button: HTMLElement, x = 10, y = 10) =>
      button.dispatchEvent(pointerEvent('pointerdown', { pointerType: 'touch', clientX: x, clientY: y }));

    it('opens the preview at 500 ms and swallows the click that follows', async () => {
      const { fixture, button, toggled, previewRequested } = await renderHeld();
      down(button);
      TestBed.tick();
      expect(button.classList).toContain('is-holding');
      vi.advanceTimersByTime(499);
      expect(previewRequested).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(previewRequested).toHaveBeenCalledTimes(1);
      fixture.detectChanges();
      expect(button.classList).not.toContain('is-holding');

      button.dispatchEvent(pointerEvent('pointerup', { pointerType: 'touch' }));
      button.click();
      expect(toggled).not.toHaveBeenCalled();
      button.click();
      expect(toggled).toHaveBeenCalledTimes(1);
    });

    for (const [name, cancel] of [
      ['9px of movement', (b: HTMLElement) => b.dispatchEvent(pointerEvent('pointermove', { pointerType: 'touch', clientX: 19, clientY: 10 }))],
      ['pointercancel', (b: HTMLElement) => b.dispatchEvent(pointerEvent('pointercancel', { pointerType: 'touch' }))],
      ['an early pointerup', (b: HTMLElement) => b.dispatchEvent(pointerEvent('pointerup', { pointerType: 'touch' }))],
    ] as const) {
      it(`is cancelled by ${name}; the click still toggles`, async () => {
        const { button, toggled, previewRequested } = await renderHeld();
        down(button);
        vi.advanceTimersByTime(200);
        cancel(button);
        vi.advanceTimersByTime(1000);
        expect(previewRequested).not.toHaveBeenCalled();
        button.click();
        expect(toggled).toHaveBeenCalledTimes(1);
      });
    }

    it('lets small movement through', async () => {
      const { button, previewRequested } = await renderHeld();
      down(button);
      button.dispatchEvent(pointerEvent('pointermove', { pointerType: 'touch', clientX: 15, clientY: 15 }));
      vi.advanceTimersByTime(500);
      expect(previewRequested).toHaveBeenCalledTimes(1);
    });

    it('lets the next tap toggle when a fired hold sent no click', async () => {
      const { button, toggled } = await renderHeld();
      down(button);
      vi.advanceTimersByTime(500);
      down(button);
      button.dispatchEvent(pointerEvent('pointerup', { pointerType: 'touch' }));
      button.click();
      expect(toggled).toHaveBeenCalledTimes(1);
    });

    it('never starts from a mouse, and a touch contextmenu opens nothing by itself', async () => {
      const { button, previewRequested } = await renderHeld();
      button.dispatchEvent(pointerEvent('pointerdown', { pointerType: 'mouse' }));
      vi.advanceTimersByTime(1000);
      expect(previewRequested).not.toHaveBeenCalled();

      down(button);
      const menu = pointerEvent('contextmenu', { pointerType: 'touch' });
      button.dispatchEvent(menu);
      expect(menu.defaultPrevented).toBe(true);
      expect(previewRequested).not.toHaveBeenCalled();
    });
  });

  describe('keyboard and right-click', () => {
    const key = (button: HTMLElement, init: KeyboardEventInit) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
      button.dispatchEvent(event);
      return event;
    };

    it('opens on the Menu key and on Shift+F10, once each', async () => {
      const { button, previewRequested } = await renderSpied();
      expect(key(button, { key: 'ContextMenu' }).defaultPrevented).toBe(true);
      // The contextmenu event the Menu key may send afterwards is the same request.
      button.dispatchEvent(pointerEvent('contextmenu', { pointerType: '' }));
      expect(previewRequested).toHaveBeenCalledTimes(1);
      expect(key(button, { key: 'F10', shiftKey: true }).defaultPrevented).toBe(true);
      expect(previewRequested).toHaveBeenCalledTimes(2);
    });

    it('ignores a plain F10, Tab and focus; Enter still toggles', async () => {
      const { button, previewRequested } = await renderSpied();
      key(button, { key: 'F10' });
      key(button, { key: 'Tab' });
      button.focus();
      expect(previewRequested).not.toHaveBeenCalled();
      expect(key(button, { key: 'Enter' }).defaultPrevented).toBe(false);
    });

    it('opens on a right-click instead of the browser menu', async () => {
      const { button, previewRequested } = await renderSpied();
      button.dispatchEvent(pointerEvent('pointerdown', { pointerType: 'mouse', button: 2 }));
      const menu = pointerEvent('contextmenu', { pointerType: 'mouse', button: 2 });
      button.dispatchEvent(menu);
      expect(menu.defaultPrevented).toBe(true);
      expect(previewRequested).toHaveBeenCalledTimes(1);
    });
  });

  describe('description', () => {
    it('describes the keys, plus the popover while it shows', async () => {
      const { fixture, button } = await render('p01', true);
      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute('data-card-id')).toBe('p01');
      const ids = () => button.getAttribute('aria-describedby')!.split(' ');
      expect(ids()).toHaveLength(1);
      expect(host.querySelector(`#${ids()[0]}`)!.textContent).toBe('Menu ou Shift+F10 abre a carta.');
      expect(button.contains(host.querySelector(`#${ids()[0]}`))).toBe(false);

      fixture.componentRef.setInput('describedBy', 'planar-preview-popover');
      await fixture.whenStable();
      expect(ids()).toEqual(['tile-keys-p01', 'planar-preview-popover']);
    });
  });
});

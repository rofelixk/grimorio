import { Component, ElementRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { stubDialog } from '@testing/dialog';
import { installResizeObserver, notifyResize, restoreResizeObserver } from '@testing/resize-observer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FluidHeight, FluidHeightConfig } from './fluid-height';
import { MOBILE_QUERY, REDUCED_MOTION_QUERY } from './media-query';

type Listener = (event: MediaQueryListEvent) => void;

/** A per-query controllable matchMedia: `set(query, matches)` fires that query's listeners. */
function stubMedia(initial: Record<string, boolean> = {}) {
  const lists = new Map<string, { matches: boolean; listeners: Listener[] }>();
  const list = (query: string) => {
    let entry = lists.get(query);
    if (!entry) {
      entry = { matches: initial[query] ?? false, listeners: [] };
      lists.set(query, entry);
    }
    return entry;
  };
  vi.stubGlobal('matchMedia', (query: string) => {
    const entry = list(query);
    return {
      get matches() {
        return entry.matches;
      },
      addEventListener: (_: string, listener: Listener) => entry.listeners.push(listener),
      removeEventListener: (_: string, listener: Listener) => {
        entry.listeners = entry.listeners.filter((each) => each !== listener);
      },
    };
  });
  return {
    set(query: string, matches: boolean) {
      const entry = list(query);
      entry.matches = matches;
      entry.listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
    },
  };
}

let options: Partial<Pick<FluidHeightConfig, 'min' | 'cap'>> = {};

@Component({
  template: `
    <dialog>
      <div #face class="face"><div #content class="content"></div></div>
    </dialog>
  `,
})
class Host {
  readonly face = viewChild<ElementRef<HTMLElement>>('face');
  readonly content = viewChild<ElementRef<HTMLElement>>('content');
  readonly fluid = new FluidHeight({
    face: () => this.face()?.nativeElement,
    observe: () => [this.content()?.nativeElement],
    measure: () => this.content()?.nativeElement.offsetHeight ?? null,
    ...options,
  });
}

function setHeight(element: HTMLElement, height: number): void {
  Object.defineProperty(element, 'offsetHeight', { value: height, configurable: true });
}

function transitionEnd(propertyName: string): Event {
  const event = new Event('transitionend', { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  return event;
}

describe('FluidHeight', () => {
  let restoreDialog: () => void;
  let fixture: ComponentFixture<Host>;
  const innerHeight = window.innerHeight;

  beforeEach(() => {
    restoreDialog = stubDialog();
    installResizeObserver();
    options = {};
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    restoreResizeObserver();
    restoreDialog();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Object.defineProperty(window, 'innerHeight', { value: innerHeight, configurable: true });
  });

  async function render(height = 120) {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const dialog = root.querySelector('dialog')!;
    const face = root.querySelector<HTMLElement>('.face')!;
    const content = root.querySelector<HTMLElement>('.content')!;
    setHeight(content, height);
    return { dialog, face, content, host: fixture.componentInstance };
  }

  it('writes the height on the first observation, with no measure of its own', async () => {
    stubMedia();
    const { face, content } = await render();
    expect(face.style.height).toBe('');
    notifyResize(content);
    expect(face.style.height).toBe('120px');
  });

  it('writes instantly before the first pointer or key press', async () => {
    stubMedia();
    const { face, content } = await render();
    notifyResize(content);
    setHeight(content, 200);
    notifyResize(content);
    expect(face.style.height).toBe('200px');
    expect(face.classList.contains('is-resizing')).toBe(false);
    expect(face.classList.contains('is-sized')).toBe(false);
  });

  it('arms at the first key press and then marks each change as resizing', async () => {
    stubMedia();
    const { dialog, face, content } = await render();
    notifyResize(content);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(face.classList.contains('is-sized')).toBe(true);
    setHeight(content, 200);
    notifyResize(content);
    expect(face.style.height).toBe('200px');
    expect(face.classList.contains('is-resizing')).toBe(true);
  });

  it('arms at the first pointer press too', async () => {
    stubMedia();
    const { dialog, face } = await render();
    dialog.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(face.classList.contains('is-sized')).toBe(true);
  });

  it("clears resizing on the face's own height transitionend", async () => {
    stubMedia();
    const { dialog, face, content } = await render();
    notifyResize(content);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    setHeight(content, 200);
    notifyResize(content);
    content.dispatchEvent(transitionEnd('height'));
    face.dispatchEvent(transitionEnd('opacity'));
    expect(face.classList.contains('is-resizing')).toBe(true);
    face.dispatchEvent(transitionEnd('height'));
    expect(face.classList.contains('is-resizing')).toBe(false);
  });

  it('clears resizing after 300 ms when no transitionend comes', async () => {
    stubMedia();
    const { dialog, face, content } = await render();
    vi.useFakeTimers();
    notifyResize(content);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    setHeight(content, 200);
    notifyResize(content);
    vi.advanceTimersByTime(299);
    expect(face.classList.contains('is-resizing')).toBe(true);
    vi.advanceTimersByTime(1);
    expect(face.classList.contains('is-resizing')).toBe(false);
  });

  it('never marks resizing under reduced motion', async () => {
    stubMedia({ [REDUCED_MOTION_QUERY]: true });
    const { dialog, face, content } = await render();
    notifyResize(content);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    setHeight(content, 200);
    notifyResize(content);
    expect(face.style.height).toBe('200px');
    expect(face.classList.contains('is-resizing')).toBe(false);
  });

  it('writes no height at phone width, and no capped or resizing', async () => {
    stubMedia({ [MOBILE_QUERY]: true });
    options = { cap: 64 };
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    const { dialog, face, content, host } = await render(700);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    notifyResize(content);
    expect(face.style.height).toBe('');
    expect(face.classList.contains('capped')).toBe(false);
    expect(face.classList.contains('is-resizing')).toBe(false);
    expect(host.fluid.capped()).toBe(false);
  });

  it('keeps the minimum', async () => {
    stubMedia();
    options = { min: 460 };
    const { face, content } = await render(300);
    notifyResize(content);
    expect(face.style.height).toBe('460px');
  });

  it('reports capped when the content cannot fit the viewport less the cap', async () => {
    stubMedia();
    options = { cap: 64 };
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    const { face, content, host } = await render(700);
    notifyResize(content);
    expect(face.classList.contains('capped')).toBe(true);
    expect(host.fluid.capped()).toBe(true);
    setHeight(content, 400);
    notifyResize(content);
    expect(face.classList.contains('capped')).toBe(false);
    expect(host.fluid.capped()).toBe(false);
  });

  it('re-measures on a window resize', async () => {
    stubMedia();
    options = { cap: 64 };
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    const { face, content } = await render(600);
    notifyResize(content);
    expect(face.classList.contains('capped')).toBe(false);
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    window.dispatchEvent(new Event('resize'));
    expect(face.classList.contains('capped')).toBe(true);
  });

  it('writes nothing when the height is unchanged', async () => {
    stubMedia();
    const { dialog, face, content } = await render();
    notifyResize(content);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    notifyResize(content);
    expect(face.style.height).toBe('120px');
    expect(face.classList.contains('is-resizing')).toBe(false);
  });

  it('disconnects and clears its timer on destroy', async () => {
    stubMedia();
    const { dialog, face, content } = await render();
    vi.useFakeTimers();
    notifyResize(content);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    setHeight(content, 200);
    notifyResize(content);
    expect(vi.getTimerCount()).toBe(1);
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
    setHeight(content, 300);
    notifyResize(content);
    window.dispatchEvent(new Event('resize'));
    expect(face.style.height).toBe('200px');
  });

  it('drops the height going to phone width while open and writes it again coming back', async () => {
    const media = stubMedia();
    options = { cap: 64 };
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    const { face, content } = await render(700);
    notifyResize(content);
    expect(face.style.height).toBe('700px');
    expect(face.classList.contains('capped')).toBe(true);

    media.set(MOBILE_QUERY, true);
    await fixture.whenStable();
    expect(face.style.height).toBe('');
    expect(face.classList.contains('capped')).toBe(false);

    media.set(MOBILE_QUERY, false);
    await fixture.whenStable();
    expect(face.style.height).toBe('700px');
    expect(face.classList.contains('capped')).toBe(true);
  });
});

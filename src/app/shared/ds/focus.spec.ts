import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FIRST_STOP_ORDER, captureFocus, focusElement, focusFirst, focusOnChange } from './focus';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

describe('focus helpers', () => {
  let outside: HTMLButtonElement;

  beforeEach(() => {
    outside = document.createElement('button');
    outside.className = 'outside';
    document.body.appendChild(outside);
    outside.focus();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('focusFirst', () => {
    it('focuses the first match of the earliest matching selector', () => {
      const root = mount(`
        <button class="plain">Voltar</button>
        <app-action-row><button class="action">Entrar</button></app-action-row>
        <input class="field" />
      `);
      const target = focusFirst(root, FIRST_STOP_ORDER);
      expect(target).toBe(root.querySelector('.field'));
      expect(document.activeElement).toBe(root.querySelector('.field'));
    });

    it('prefers an action-row button over an earlier plain one, and skips a readonly field', () => {
      const root = mount(`
        <input readonly />
        <button class="plain">Voltar</button>
        <app-action-row><button class="action">Entrar</button></app-action-row>
      `);
      expect(focusFirst(root, FIRST_STOP_ORDER)).toBe(root.querySelector('.action'));
    });

    it('skips a disabled button', () => {
      const root = mount(`
        <app-action-row><button disabled>Entrar</button></app-action-row>
        <button class="plain">Voltar</button>
      `);
      expect(focusFirst(root, FIRST_STOP_ORDER)).toBe(root.querySelector('.plain'));
    });

    it('returns null and moves nothing when nothing matches or there is no root', () => {
      const root = mount('<p>Texto</p>');
      expect(focusFirst(root, FIRST_STOP_ORDER)).toBeNull();
      expect(focusFirst(null, FIRST_STOP_ORDER)).toBeNull();
      expect(focusFirst(undefined, FIRST_STOP_ORDER)).toBeNull();
      expect(document.activeElement).toBe(outside);
    });
  });

  describe('focusElement', () => {
    it('focuses a connected element', () => {
      const root = mount('<button class="b">B</button>');
      focusElement(root.querySelector<HTMLElement>('.b'));
      expect(document.activeElement).toBe(root.querySelector('.b'));
    });

    it('ignores null and detached elements', () => {
      focusElement(null);
      focusElement(undefined);
      focusElement(document.createElement('button'));
      expect(document.activeElement).toBe(outside);
    });
  });

  describe('captureFocus', () => {
    it('gives focus back to the element active when captured', () => {
      const restore = captureFocus();
      const root = mount('<button class="b">B</button>');
      root.querySelector<HTMLElement>('.b')!.focus();
      restore();
      expect(document.activeElement).toBe(outside);
    });

    it('does not throw when the opener was removed', () => {
      const restore = captureFocus();
      const root = mount('<button class="b">B</button>');
      root.querySelector<HTMLElement>('.b')!.focus();
      outside.remove();
      expect(() => restore()).not.toThrow();
      expect(document.activeElement).toBe(root.querySelector('.b'));
    });
  });
});

@Component({
  template: `
    @if (shown()) {
      <div #root>
        <span>{{ tick() }}</span>
        <input class="field" />
      </div>
    }
  `,
})
class Host {
  readonly key = signal('');
  readonly tick = signal(0);
  readonly shown = signal(true);
  readonly root = viewChild<ElementRef<HTMLElement>>('root');

  constructor() {
    focusOnChange(this.key, this.root, FIRST_STOP_ORDER);
  }
}

describe('focusOnChange', () => {
  let outside: HTMLButtonElement;

  beforeEach(() => {
    outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    outside.remove();
  });

  async function render() {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const field = () => (fixture.nativeElement as HTMLElement).querySelector('.field');
    return { fixture, host: fixture.componentInstance, field };
  }

  it('does nothing while the key is empty', async () => {
    await render();
    expect(document.activeElement).toBe(outside);
  });

  it('focuses on the first non-empty key, and not again on a re-render with the same key', async () => {
    const { fixture, host, field } = await render();
    host.key.set('in');
    await fixture.whenStable();
    expect(document.activeElement).toBe(field());

    outside.focus();
    host.tick.set(1);
    await fixture.whenStable();
    expect(document.activeElement).toBe(outside);

    host.shown.set(false);
    await fixture.whenStable();
    host.shown.set(true);
    await fixture.whenStable();
    expect(document.activeElement).toBe(outside);
  });

  it('focuses again when the key changes', async () => {
    const { fixture, host, field } = await render();
    host.key.set('in');
    await fixture.whenStable();
    outside.focus();
    host.key.set('up');
    await fixture.whenStable();
    expect(document.activeElement).toBe(field());
  });
});

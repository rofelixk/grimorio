import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanarImageService } from '@services/planar-image.service';
import { planarCard } from '@testing/planechase-fixtures';
import { PlanarPreviewDialog } from './planar-preview-dialog';

describe('PlanarPreviewDialog', () => {
  const originals = {
    showModal: HTMLDialogElement.prototype.showModal,
    close: HTMLDialogElement.prototype.close,
  };

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    TestBed.configureTestingModule({
      imports: [PlanarPreviewDialog],
      providers: [{ provide: PlanarImageService, useValue: { url: vi.fn().mockResolvedValue(null) } }],
    });
  });

  afterEach(() => {
    // Destroying closes the dialog, so it must happen while the stubs are still in place.
    TestBed.resetTestingModule();
    document.body.querySelectorAll('app-planar-preview-dialog').forEach((node) => node.remove());
    HTMLDialogElement.prototype.showModal = originals.showModal;
    HTMLDialogElement.prototype.close = originals.close;
  });

  async function render({ on = true, variant = 'wide' as 'wide' | 'narrow', index = 2, total = 9 } = {}) {
    const fixture = TestBed.createComponent(PlanarPreviewDialog);
    const set = fixture.componentRef.setInput.bind(fixture.componentRef);
    set('card', planarCard('p02'));
    set('on', on);
    set('variant', variant);
    set('setName', 'New Set');
    set('index', index);
    set('total', total);
    set('hasPrevious', index > 1);
    set('hasNext', index < total);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const byLabel = (label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    return { fixture, el, closed, byLabel, dialog: el.querySelector('dialog')! };
  }

  it('opens labelled by the card name, with focus on ✕', async () => {
    const { dialog, byLabel } = await render();
    expect(dialog.open).toBe(true);
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe('Card P02');
    expect(document.activeElement).toBe(byLabel('Fechar'));
  });

  it('shows the set and the position', async () => {
    const { el } = await render();
    expect(el.querySelector('.position')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('New Set · 2 de 9');
    expect(el.querySelector('.position [lang="en"]')!.textContent).toBe('New Set');
  });

  it('disables Anterior on the first card and Próxima on the last', async () => {
    const first = await render({ index: 1 });
    expect(first.byLabel('Carta anterior').disabled).toBe(true);
    expect(first.byLabel('Próxima carta').disabled).toBe(false);
    const last = await render({ index: 9 });
    expect(last.byLabel('Carta anterior').disabled).toBe(false);
    expect(last.byLabel('Próxima carta').disabled).toBe(true);
  });

  it('offers to disable an on card, and to enable an off one', async () => {
    const on = await render({ on: true });
    const disable = on.el.querySelector<HTMLButtonElement>('.toggle')!;
    expect(disable.textContent!.trim()).toBe('Desativar carta');
    expect(disable.getAttribute('aria-pressed')).toBe('true');
    expect(disable.classList).toContain('btn--secondary');

    const off = await render({ on: false });
    const enable = off.el.querySelector<HTMLButtonElement>('.toggle')!;
    expect(enable.textContent!.trim()).toBe('Ativar carta');
    expect(enable.getAttribute('aria-pressed')).toBe('false');
    expect(enable.classList).toContain('btn--primary');
  });

  it('puts the toggle after the nav when wide, before it when narrow', async () => {
    const order = (el: HTMLElement) => [...el.querySelectorAll('.footer button')].map((b) => b.textContent!.trim());
    expect(order((await render({ variant: 'wide' })).el)).toEqual(['Anterior', 'Próxima', 'Desativar carta']);
    const narrow = await render({ variant: 'narrow' });
    expect(order(narrow.el)).toEqual(['Desativar carta', 'Anterior', 'Próxima']);
    expect(narrow.el.querySelector('.ring')).toBeNull();
  });

  it('emits the buttons’ outputs', async () => {
    const { fixture, byLabel, el } = await render();
    const spies = { toggled: vi.fn(), previous: vi.fn(), next: vi.fn() };
    fixture.componentInstance.toggled.subscribe(spies.toggled);
    fixture.componentInstance.previous.subscribe(spies.previous);
    fixture.componentInstance.next.subscribe(spies.next);
    byLabel('Carta anterior').click();
    byLabel('Próxima carta').click();
    el.querySelector<HTMLButtonElement>('.toggle')!.click();
    expect(spies.previous).toHaveBeenCalledTimes(1);
    expect(spies.next).toHaveBeenCalledTimes(1);
    expect(spies.toggled).toHaveBeenCalledTimes(1);
  });

  it('closes on ✕, on Esc and on a backdrop click, not on a click inside', async () => {
    const { dialog, closed, byLabel, el } = await render();
    byLabel('Fechar').click();
    expect(closed).toHaveBeenCalledTimes(1);

    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(closed).toHaveBeenCalledTimes(2);

    el.querySelector<HTMLElement>('.body')!.click();
    expect(closed).toHaveBeenCalledTimes(2);
    dialog.click();
    expect(closed).toHaveBeenCalledTimes(3);
  });

  it('closes the dialog when destroyed', async () => {
    const { fixture, dialog } = await render();
    fixture.destroy();
    expect(dialog.open).toBe(false);
  });
});

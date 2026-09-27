import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanechaseGame } from '@models/planechase-game.model';
import { availableActions } from '@utils/planechase-game.util';
import { planarDisplay } from '@utils/planechase-copy';
import { PlanarConfirm } from '@shared/gameplay/planar-controls';
import { PlanarConsole } from './planar-console';

const base: PlanechaseGame = {
  list: ['p01', 'p02', 'f01'],
  current: 'p01',
  used: [],
  drawOrder: ['p02', 'f01'],
  cost: 2,
  pending: null,
  result: { kind: 'blank' },
  undo: null,
};

describe('PlanarConsole', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PlanarConsole] }));

  async function render(game: PlanechaseGame, confirm: PlanarConfirm = null) {
    const fixture = TestBed.createComponent(PlanarConsole);
    fixture.componentRef.setInput('display', planarDisplay(game, (id) => `Name ${id}`, false));
    fixture.componentRef.setInput('actions', availableActions(game));
    fixture.componentRef.setInput('confirm', confirm);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === label)!;
    return { fixture, el, button };
  }

  it('shows the result in a live region with the cost eyebrow', async () => {
    const { el } = await render(base);
    const status = el.querySelector('[role="status"]')!;
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Dado planar · próxima rolagem {2}');
    expect(status.textContent).toContain('Nada acontece');
    expect(status.textContent).toContain('O plano continua o mesmo.');
  });

  it('offers every action with nothing pending, Desfazer only with an undo slot', async () => {
    const { button } = await render(base);
    expect(button('Desfazer').disabled).toBe(true);
    expect(button('Zerar custo').disabled).toBe(false);
    expect(button('Planeswalk').disabled).toBe(false);
    expect(button('Rolar dado planar').disabled).toBe(false);

    const withUndo = await render({ ...base, undo: { ...base } });
    expect(withUndo.button('Desfazer').disabled).toBe(false);
  });

  it('while a phenomenon waits: "Concluir encontro", Zerar custo and Planeswalk disabled', async () => {
    const { el, button, fixture } = await render({ ...base, current: 'f01', pending: 'phenomenon', result: { kind: 'phenomenon' }, undo: { ...base } });
    expect(el.textContent).toContain('Fenômeno encontrado');
    expect(el.querySelector('.eyebrow')!.textContent).toBe('Fenômeno');
    expect(button('Zerar custo').disabled).toBe(true);
    expect(button('Planeswalk').disabled).toBe(true);
    expect(button('Desfazer').disabled).toBe(false);
    const confirm = vi.fn();
    fixture.componentInstance.confirmPhenomenon.subscribe(confirm);
    button('Concluir encontro').click();
    expect(confirm).toHaveBeenCalled();
  });

  it('all used: only Desfazer and a primary "Reiniciar planos"', async () => {
    const { el, button, fixture } = await render({ ...base, drawOrder: [], used: ['p02', 'f01'], pending: 'reset', result: { kind: 'allUsed' } });
    expect(el.querySelector('.eyebrow')!.textContent).toBe('Planeswalk pendente');
    expect(el.textContent).toContain('Todos os planos foram usados');
    expect([...el.querySelectorAll('button')].map((b) => b.textContent!.trim())).toEqual(['Desfazer', 'Reiniciar planos']);
    const reshuffle = vi.fn();
    fixture.componentInstance.reshuffle.subscribe(reshuffle);
    button('Reiniciar planos').click();
    expect(reshuffle).toHaveBeenCalled();
  });

  it('emits each action', async () => {
    const { button, fixture } = await render(base);
    const calls: string[] = [];
    const component = fixture.componentInstance;
    component.roll.subscribe(() => calls.push('roll'));
    component.planeswalk.subscribe(() => calls.push('planeswalk'));
    component.resetCost.subscribe(() => calls.push('resetCost'));
    button('Rolar dado planar').click();
    button('Planeswalk').click();
    button('Zerar custo').click();
    expect(calls).toEqual(['roll', 'planeswalk', 'resetCost']);
  });

  it('the reset confirm is an alertdialog with no counts, focused on Cancelar; Esc cancels', async () => {
    const { el, button, fixture } = await render({ ...base, used: ['p02'], drawOrder: ['f01'] }, 'reset');
    const dialog = el.querySelector('[role="alertdialog"]')!;
    expect(el.querySelector('#' + dialog.getAttribute('aria-labelledby'))!.textContent).toBe('Reiniciar planos?');
    expect(el.querySelector('#' + dialog.getAttribute('aria-describedby'))!.textContent).toBe(
      'Os planos usados voltam ao baralho. O plano atual continua na mesa.',
    );
    expect(dialog.textContent).not.toMatch(/\d/);
    expect(document.activeElement).toBe(button('Cancelar'));

    const cancel = vi.fn();
    const accept = vi.fn();
    fixture.componentInstance.confirmCancel.subscribe(cancel);
    fixture.componentInstance.confirmAccept.subscribe(accept);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancel).toHaveBeenCalledTimes(1);
    dialog.querySelector<HTMLButtonElement>('.btn--danger')!.click();
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('the end confirm says what leaves and what stays', async () => {
    const { el } = await render(base, 'end');
    const dialog = el.querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('Encerrar partida?');
    expect(dialog.textContent).toContain('A partida some deste aparelho. Seu baralho continua salvo.');
    expect(dialog.querySelector('.btn--danger')!.textContent!.trim()).toBe('Encerrar partida');
  });
});

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanechaseGame } from '@models/planechase-game.model';
import { availableActions } from '@utils/planechase-game.util';
import { planarDisplay } from '@utils/planechase-copy';
import { PlanarConfirm } from '@shared/gameplay/planar-controls';
import { PlanarDock } from './planar-dock';

const base: PlanechaseGame = {
  list: ['p01', 'p02', 'f01'],
  current: 'p01',
  used: [],
  drawOrder: ['p02', 'f01'],
  cost: 1,
  pending: null,
  result: { kind: 'chaos' },
  undo: null,
};

describe('PlanarDock', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PlanarDock] }));

  async function render(game: PlanechaseGame, confirm: PlanarConfirm = null) {
    const fixture = TestBed.createComponent(PlanarDock);
    fixture.componentRef.setInput('display', planarDisplay(game, (id) => `Name ${id}`, false));
    fixture.componentRef.setInput('actions', availableActions(game));
    fixture.componentRef.setInput('confirm', confirm);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === label)!;
    return { fixture, el, button };
  }

  it('shows the result, its detail and the next cost in a live region', async () => {
    const { el } = await render(base);
    const status = el.querySelector('[role="status"]')!;
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Caos');
    expect(status.textContent).toContain('Resolva a habilidade de caos destacada abaixo.');
    expect(status.textContent).toContain('Próxima: {1}');
  });

  it('offers the row, then Caos beside the growing roll button, Desfazer only with an undo slot', async () => {
    const { button, fixture } = await render(base);
    expect(button('Desfazer').disabled).toBe(true);
    expect(button('Planeswalk').disabled).toBe(false);
    expect(button('Zerar custo').disabled).toBe(false);
    const roll = button('Rolar dado planar');
    expect(roll.classList).toContain('grow');
    const caos = button('Caos');
    expect(caos.parentElement).toBe(roll.parentElement);
    const chaos = vi.fn();
    fixture.componentInstance.chaos.subscribe(chaos);
    caos.click();
    expect(chaos).toHaveBeenCalled();
  });

  it('while a phenomenon waits: "Concluir encontro", Planeswalk and Zerar custo disabled', async () => {
    const { button } = await render({ ...base, current: 'f01', pending: 'phenomenon', result: { kind: 'phenomenon' }, undo: { ...base } });
    expect(button('Concluir encontro')).toBeTruthy();
    expect(button('Planeswalk').disabled).toBe(true);
    expect(button('Zerar custo').disabled).toBe(true);
    expect(button('Desfazer').disabled).toBe(false);
  });

  it('all used: the main button is "Reiniciar planos", Planeswalk and Zerar custo disabled', async () => {
    const { button, fixture } = await render({ ...base, drawOrder: [], used: ['p02', 'f01'], pending: 'reset', result: { kind: 'allUsed' } });
    expect(button('Planeswalk').disabled).toBe(true);
    expect(button('Zerar custo').disabled).toBe(true);
    expect(button('Caos')).toBeUndefined();
    const main = button('Reiniciar planos');
    expect(main.classList).toContain('grow');
    const reshuffle = vi.fn();
    fixture.componentInstance.reshuffle.subscribe(reshuffle);
    main.click();
    expect(reshuffle).toHaveBeenCalled();
  });

  it('the confirm is an alertdialog focused on Cancelar; Esc cancels', async () => {
    const { el, button, fixture } = await render(base, 'end');
    const dialog = el.querySelector('[role="alertdialog"]')!;
    expect(dialog.classList).toContain('is-confirm');
    expect(dialog.textContent).toContain('Encerrar partida?');
    expect(document.activeElement).toBe(button('Cancelar'));
    const cancel = vi.fn();
    fixture.componentInstance.confirmCancel.subscribe(cancel);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancel).toHaveBeenCalled();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanarCardData } from '@data/planechase/planar-card.model';
import { DEFAULT_OFF_IDS } from '@data/planechase/default-off';
import type { PlanechaseGame } from '@models/planechase-game.model';
import { PlanarImageService } from '@services/planar-image.service';
import { PlanarSelectionService } from '@services/planar-selection.service';
import { PLANECHASE_DATA, PlanechaseCatalogService } from '@services/planechase-catalog.service';
import { PLANECHASE_RANDOM, PlanechaseGameService } from '@services/planechase-game.service';
import { PLANAR_DATA, PLANAR_RECORDS, PLANAR_TRANSLATIONS, scriptedRandom } from '@testing/planechase-fixtures';
import { INTERPLANAR_TUNNEL } from '@utils/planechase-game.util';
import { getDeviceDb } from '@db/device-db';
import { Planechase } from './planechase';

const IDS = PLANAR_RECORDS.map((card) => card.id);
/** Fisher–Yates with j = i at every step keeps the input order: p01 starts, p02 is next. */
const IN_ORDER = Array.from({ length: IDS.length - 1 }, (_, i) => IDS.length - 1 - i);

interface Options {
  data?: PlanarCardData;
  random?: number[];
  disabled?: string[];
  game?: PlanechaseGame;
}

async function setUp({ data = PLANAR_DATA, random = IN_ORDER, disabled, game }: Options = {}) {
  if (game) {
    const db = await getDeviceDb();
    await db.put('meta', { key: 'planechaseGame', value: game });
  }
  TestBed.configureTestingModule({
    imports: [Planechase],
    providers: [
      provideRouter([]),
      { provide: PLANECHASE_DATA, useValue: () => Promise.resolve({ cards: data, translations: PLANAR_TRANSLATIONS }) },
      { provide: PLANECHASE_RANDOM, useValue: scriptedRandom(random) },
      { provide: PlanarImageService, useValue: { url: vi.fn().mockResolvedValue(null) } },
    ],
  });
  const service = TestBed.inject(PlanechaseGameService);
  const selection = TestBed.inject(PlanarSelectionService);
  await Promise.all([service.whenReady(), selection.load(null), TestBed.inject(PlanechaseCatalogService).load()]);
  if (disabled) {
    selection.save(disabled);
  }
  const fixture = TestBed.createComponent(Planechase);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const click = async (label: string) => {
    const target = [...el.querySelectorAll<HTMLElement>('button, a')].find((b) => b.textContent!.trim() === label);
    if (!target) {
      throw new Error(`No control "${label}".`);
    }
    target.click();
    await fixture.whenStable();
  };
  const control = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === label)!;
  return { fixture, el, service, selection, click, control };
}

describe('Planechase', () => {
  beforeEach(() => {
    // Reduced motion: flairs resolve at once and add nothing.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  afterEach(async () => {
    await TestBed.inject(PlanechaseGameService).flush();
    await TestBed.inject(PlanarSelectionService).flush();
    vi.unstubAllGlobals();
  });

  it('with no game, shows the intro and the saved deck size', async () => {
    const { el } = await setUp();
    expect(el.querySelector('.eyebrow')!.textContent).toBe('Nenhuma partida');
    expect(el.querySelector('h1')!.textContent).toBe('Planechase');
    expect(el.textContent).toContain(`Baralho: ${IDS.length} cartas ativas`);
  });

  it('starts a game without the default-off cards when nothing is saved', async () => {
    const otaria = { ...PLANAR_RECORDS[0], id: DEFAULT_OFF_IDS[0], name: 'Otaria', hash: 'hash-otaria' };
    const { el, service, click } = await setUp({ data: { cards: [...PLANAR_RECORDS, otaria] } });
    await click('Iniciar partida');
    expect(service.game()!.list).toEqual(IDS);
    expect(el.querySelector('[role="status"]')!.textContent).toContain('Plano inicial');
    expect(el.querySelector('[role="status"]')!.textContent).toContain(
      'Card P01 abre a partida. Role o dado na fase principal do seu turno.',
    );
    expect(el.querySelector('app-planar-card h2')!.textContent).toBe('Card P01');
  });

  it('wires roll, Planeswalk and Desfazer to the game', async () => {
    // Start in order, then roll face 1 (planeswalk).
    const { el, service, click, control } = await setUp({ random: [...IN_ORDER, 0] });
    await click('Iniciar partida');
    expect(control('Desfazer').disabled).toBe(true);

    await click('Rolar dado planar');
    expect(service.game()!.current).toBe('p02');
    expect(service.game()!.cost).toBe(1);
    expect(el.querySelector('[role="status"]')!.textContent).toContain('Card P01 foi para os usados.');

    await click('Planeswalk');
    expect(service.game()!.current).toBe('p03');
    expect(service.game()!.cost).toBe(1);

    await click('Desfazer');
    expect(service.game()!.current).toBe('p02');
    expect(control('Desfazer').disabled).toBe(true);
  });

  it('"Caos" marks a physical-die chaos: plate lit, same card, cost unchanged, undoable', async () => {
    const { el, service, click } = await setUp();
    await click('Iniciar partida');
    await click('Caos');
    expect(service.game()!.current).toBe('p01');
    expect(service.game()!.cost).toBe(0);
    expect(el.querySelector('[role="status"]')!.textContent).toContain(
      'Resolva a habilidade de caos destacada abaixo. O custo do dado não muda.',
    );
    expect(el.querySelector('.ability')!.classList).toContain('is-lit');

    await click('Desfazer');
    expect(service.game()!.result).toEqual({ kind: 'start' });
  });

  it('a pending phenomenon disables roll, Planeswalk, Caos, Zerar custo and Reiniciar planos', async () => {
    const { el, click, control } = await setUp();
    await click('Iniciar partida');
    for (let i = 0; i < 6; i++) {
      await click('Planeswalk');
    }
    expect(el.textContent).toContain('Fenômeno encontrado');
    expect(control('Planeswalk').disabled).toBe(true);
    expect(control('Caos').disabled).toBe(true);
    expect(control('Zerar custo').disabled).toBe(true);
    expect(control('Reiniciar planos').disabled).toBe(true);
    expect(control('Rolar dado planar')).toBeUndefined();
    expect(control('Concluir encontro').disabled).toBe(false);
    expect(el.querySelector('.ability')!.classList).toContain('is-lit');
  });

  it('never shows how many cards are used or available', async () => {
    const { el, click } = await setUp();
    await click('Iniciar partida');
    for (let i = 0; i < 3; i++) {
      await click('Planeswalk');
    }
    expect(el.querySelector('.links')!.textContent).not.toMatch(/\d/);
    expect(el.textContent).not.toMatch(/usados ·|disponíveis/);
  });

  it('refuses to start a saved selection under 10 cards, without changing it', async () => {
    const { el, service, selection, click } = await setUp({ disabled: IDS.slice(0, 6) });
    await click('Iniciar partida');
    expect(service.game()).toBeNull();
    const alert = el.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Seu baralho salvo tem 8 cartas ativas; são necessárias pelo menos 10.');
    expect(alert.querySelector('a')!.textContent).toBe('Ajustar baralho');
    expect(selection.selection()!.disabledIds).toEqual(IDS.slice(0, 6));
  });

  it('refuses to start a saved selection with no plane', async () => {
    const data: PlanarCardData = {
      cards: Array.from({ length: 12 }, (_, i) => ({ ...PLANAR_RECORDS[6], id: `f${i}`, name: `Phenomenon ${i}` })),
    };
    const { el, service, click } = await setUp({ data });
    await click('Iniciar partida');
    expect(service.game()).toBeNull();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Seu baralho salvo não tem nenhum plano ativo.');
  });

  it('confirms "Reiniciar planos" inline; Cancelar keeps the game and returns focus', async () => {
    const { fixture, el, service, click, control } = await setUp();
    await click('Iniciar partida');
    await click('Planeswalk');
    const before = service.game();

    const link = control('Reiniciar planos');
    link.click();
    await fixture.whenStable();
    const dialog = el.querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('Reiniciar planos?');
    await click('Cancelar');
    expect(el.querySelector('[role="alertdialog"]')).toBeNull();
    expect(service.game()).toBe(before);
    expect(document.activeElement).toBe(link);

    control('Reiniciar planos').click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('[role="alertdialog"] .btn--danger')!.click();
    expect(service.game()!.used).toEqual([]);
    expect(service.game()!.result).toEqual({ kind: 'reset' });
  });

  it('"Encerrar partida" confirms, then returns to the no-game state', async () => {
    const { fixture, el, service, click, control } = await setUp();
    await click('Iniciar partida');
    control('Encerrar partida').click();
    await fixture.whenStable();
    const dialog = el.querySelector('[role="alertdialog"]')!;
    dialog.querySelector<HTMLButtonElement>('.btn--danger')!.click();
    await fixture.whenStable();
    expect(service.game()).toBeNull();
    await click('Iniciar partida');
    expect(service.inProgress()).toBe(true);
  });

  it('in the all-used state, "Reiniciar planos" completes the planeswalk without a confirm', async () => {
    const game: PlanechaseGame = {
      list: IDS,
      current: 'p11',
      used: IDS.filter((id) => id !== 'p11'),
      drawOrder: [],
      cost: 2,
      pending: 'reset',
      result: { kind: 'allUsed' },
      undo: null,
    };
    // The reshuffle deals the 13 cards other than p11 in order, so p01 comes up next.
    const { el, service, control } = await setUp({ game, random: IN_ORDER.slice(1) });
    expect(el.textContent).toContain('Todos os planos foram usados');
    control('Reiniciar planos').click();
    expect(el.querySelector('[role="alertdialog"]')).toBeNull();
    expect(service.game()!.pending).toBeNull();
    expect(service.game()!.current).not.toBe('p11');
    expect(service.game()!.used).toEqual(['p11']);
  });

  describe('Interplanar Tunnel', () => {
    const tunnelRecord = { ...PLANAR_RECORDS[6], id: INTERPLANAR_TUNNEL, name: 'Interplanar Tunnel', hash: 'hash-tunnel' };
    const drawOrder = ['p02', 'f01', 'p03', 'p04', 'p05', 'p06', 'p07'];
    const game: PlanechaseGame = {
      list: [INTERPLANAR_TUNNEL, 'p01', ...drawOrder],
      current: INTERPLANAR_TUNNEL,
      used: ['p01'],
      drawOrder,
      cost: 1,
      pending: 'phenomenon',
      result: { kind: 'phenomenon' },
      undo: null,
    };
    const radios = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    const tunnelSetUp = () => setUp({ data: { cards: [...PLANAR_RECORDS, tunnelRecord] }, game, random: [] });

    it('shows the five revealed planes and holds "Concluir encontro" until one is picked', async () => {
      const { el, control, fixture } = await tunnelSetUp();
      expect(el.querySelector('[role="status"]')!.textContent).toContain('Escolha o próximo plano');
      expect(el.querySelector('[role="radiogroup"]')!.getAttribute('aria-labelledby')).toBeTruthy();
      expect(el.textContent).toContain('5 planos revelados');
      // Phenomena revealed on the way aren't choices; the sixth plane isn't revealed.
      expect(radios(el).map((radio) => radio.getAttribute('aria-label'))).toEqual([
        'Card P02',
        'Card P03',
        'Card P04',
        'Card P05',
        'Card P06',
      ]);
      expect(radios(el).map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1, -1]);
      expect(control('Concluir encontro').disabled).toBe(true);

      radios(el)[2].click();
      await fixture.whenStable();
      expect(radios(el)[2].getAttribute('aria-checked')).toBe('true');
      expect(radios(el).map((radio) => radio.tabIndex)).toEqual([-1, -1, 0, -1, -1]);
      expect(control('Concluir encontro').disabled).toBe(false);
    });

    it('moves the pick with the arrow keys, wrapping at the ends', async () => {
      const { el, fixture } = await tunnelSetUp();
      // With nothing picked, the first arrow picks the focused plane (FR-017).
      radios(el)[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await fixture.whenStable();
      expect(radios(el)[0].getAttribute('aria-checked')).toBe('true');

      radios(el)[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await fixture.whenStable();
      expect(radios(el)[4].getAttribute('aria-checked')).toBe('true');
      expect(document.activeElement).toBe(radios(el)[4]);

      radios(el)[4].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await fixture.whenStable();
      expect(radios(el)[0].getAttribute('aria-checked')).toBe('true');
    });

    it('planeswalks to the picked plane, and Desfazer brings the same reveal back unpicked', async () => {
      const { el, service, click, fixture } = await tunnelSetUp();
      radios(el)[3].click();
      await fixture.whenStable();
      await click('Concluir encontro');

      expect(service.game()!.current).toBe('p05');
      expect(service.game()!.drawOrder[0]).toBe('p07');
      expect(service.game()!.cost).toBe(1);
      expect(el.querySelector('app-tunnel-choice')).toBeNull();
      expect(el.querySelector('[role="status"]')!.textContent).toContain('Interplanar Tunnel foi para os usados.');

      await click('Desfazer');
      expect(service.game()!.current).toBe(INTERPLANAR_TUNNEL);
      expect(radios(el)).toHaveLength(5);
      expect(radios(el).some((radio) => radio.getAttribute('aria-checked') === 'true')).toBe(false);
    });
  });
});

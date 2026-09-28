import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanarCardRecord } from '../../core/data/planechase/planar-card.model';
import { DEFAULT_OFF_IDS } from '../../core/data/planechase/default-off';
import { pointerEvent } from '@testing/pointer-events';
import { PlanarImageService } from '@services/planar-image.service';
import { PlanarSelectionService } from '@services/planar-selection.service';
import { PLANECHASE_DATA, PlanechaseCatalogService } from '@services/planechase-catalog.service';
import { PLANECHASE_RANDOM, PlanechaseGameService } from '@services/planechase-game.service';
import { PLANAR_DATA, PLANAR_RECORDS, PLANAR_TRANSLATIONS, scriptedRandom } from '@testing/planechase-fixtures';
import { PlanechaseDeck } from './planechase-deck';

const IDS = PLANAR_RECORDS.map((card) => card.id);

/** A catalog card on the default-off list (FR-016), to add to the fixtures. */
const OTARIA: PlanarCardRecord = { ...PLANAR_RECORDS[0], id: DEFAULT_OFF_IDS[0], name: 'Otaria', hash: 'hash-otaria' };

async function setUp({ game = false, extra = [] as PlanarCardRecord[] } = {}) {
  const data = { cards: [...PLANAR_DATA.cards, ...extra] };
  TestBed.configureTestingModule({
    imports: [PlanechaseDeck],
    providers: [
      provideRouter([]),
      { provide: PLANECHASE_DATA, useValue: () => Promise.resolve({ cards: data, translations: PLANAR_TRANSLATIONS }) },
      { provide: PLANECHASE_RANDOM, useValue: scriptedRandom([]) },
      { provide: PlanarImageService, useValue: { url: vi.fn().mockResolvedValue(null) } },
    ],
  });
  const service = TestBed.inject(PlanechaseGameService);
  const selection = TestBed.inject(PlanarSelectionService);
  await Promise.all([service.whenReady(), selection.load(null), TestBed.inject(PlanechaseCatalogService).load()]);
  if (game) {
    service.start(IDS);
    service.planeswalk();
  }
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PlanechaseDeck);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === label)!;
  const click = async (target: HTMLElement) => {
    target.click();
    await fixture.whenStable();
  };
  const tile = (id: string) => el.querySelector<HTMLButtonElement>(`app-planar-tile button[aria-label^="Card ${id.toUpperCase()},"]`)!;
  return { fixture, el, service, selection, navigate, button, click, tile };
}

describe('PlanechaseDeck', () => {
  afterEach(async () => {
    await TestBed.inject(PlanechaseGameService).flush();
    await TestBed.inject(PlanarSelectionService).flush();
  });

  it('shows every card on by default, the counter and the size notice', async () => {
    const { el } = await setUp();
    expect(el.querySelectorAll('app-planar-tile [aria-pressed="true"]')).toHaveLength(IDS.length);
    expect(el.querySelector('[aria-live="polite"]')!.textContent).toBe('14 de 14 cartas · 3 fenômenos');
    expect(el.querySelector('.notice')).not.toBeNull();
  });

  it('blocks saving under 10 cards and keeps the draft', async () => {
    const { el, selection, navigate, button, click, tile } = await setUp();
    for (const id of ['p01', 'p02', 'p03', 'p04', 'p05']) {
      await click(tile(id));
    }
    await click(button('Salvar'));
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Ative pelo menos 10 cartas para salvar — agora são 9.');
    expect(selection.selection()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(tile('p01').getAttribute('aria-pressed')).toBe('false');
  });

  it('saves without a game and goes back', async () => {
    const { selection, navigate, button, click, tile } = await setUp();
    await click(tile('f01'));
    await click(button('Salvar'));
    // The default list comes along: ids missing from the catalog are kept (R11).
    expect(selection.selection()!.disabledIds).toEqual([...DEFAULT_OFF_IDS, 'f01']);
    expect(navigate).toHaveBeenCalledWith('/modes/planechase');
  });

  it('with a game, a changed deck asks first; Salvar e reiniciar starts over', async () => {
    const { el, service, selection, navigate, button, click, tile } = await setUp({ game: true });
    await click(tile('f01'));
    await click(button('Salvar'));
    expect(el.querySelector('[role="alertdialog"]')!.textContent).toContain('Salvar reinicia a partida em andamento.');
    expect(selection.selection()).toBeNull();

    await click(button('Salvar e reiniciar'));
    expect(selection.selection()!.disabledIds).toEqual([...DEFAULT_OFF_IDS, 'f01']);
    expect(service.game()!.list).not.toContain('f01');
    expect(service.game()!.cost).toBe(0);
    expect(service.game()!.undo).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/modes/planechase');
  });

  it('Manter partida keeps the game and the saved deck', async () => {
    const { el, service, selection, navigate, button, click, tile } = await setUp({ game: true });
    const before = service.game();
    await click(tile('f01'));
    await click(button('Salvar'));
    await click(button('Manter partida'));
    expect(el.querySelector('[role="alertdialog"]')).toBeNull();
    expect(service.game()).toBe(before);
    expect(selection.selection()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('an untouched draft follows a new saved selection and saves without asking', async () => {
    const { fixture, el, service, selection, navigate, button, click } = await setUp({ game: true });
    // What a profile switch looks like from here: the saved selection changes under the view.
    selection.applySyncResult({ disabledIds: ['f02'], updatedAt: '2026-01-01T00:00:00.000Z' });
    await fixture.whenStable();
    const before = service.game();
    await click(button('Salvar'));
    expect(el.querySelector('[role="alertdialog"]')).toBeNull();
    expect(service.game()).toBe(before);
    expect(navigate).toHaveBeenCalledWith('/modes/planechase');
  });

  it('a collapsed set renders no tiles; its toggles still apply', async () => {
    const { el, button, click } = await setUp();
    const header = el.querySelector<HTMLButtonElement>('[aria-controls="set-old"]')!;
    await click(header);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelectorAll('#set-old app-planar-tile')).toHaveLength(0);
    expect(el.querySelectorAll('#set-nws app-planar-tile')).toHaveLength(7);

    const oldSet = header.closest('.set')!;
    await click([...oldSet.querySelectorAll<HTMLButtonElement>('.link-btn')].find((b) => b.textContent === 'Desativar todos')!);
    expect(header.textContent).toContain('0 de 7');
    expect(button('Salvar')).toBeDefined();
  });

  describe('default selection (FR-017)', () => {
    it('with nothing saved, a default-off card starts off', async () => {
      const { el, tile } = await setUp({ extra: [OTARIA] });
      const otaria = el.querySelector(`[data-card-id="${OTARIA.id}"] button`)!;
      expect(otaria.getAttribute('aria-pressed')).toBe('false');
      expect(tile('p01').getAttribute('aria-pressed')).toBe('true');
      expect(el.querySelector('[aria-live="polite"]')!.textContent).toBe('14 de 15 cartas · 3 fenômenos');
    });

    it('a saved selection alone decides', async () => {
      const { el, selection, fixture } = await setUp({ extra: [OTARIA] });
      selection.applySyncResult({ disabledIds: ['p01'], updatedAt: '2026-01-01T00:00:00.000Z' });
      await fixture.whenStable();
      expect(el.querySelector(`[data-card-id="${OTARIA.id}"] button`)!.getAttribute('aria-pressed')).toBe('true');
      expect(el.querySelector('[aria-live="polite"]')!.textContent).toBe('14 de 15 cartas · 3 fenômenos');
    });
  });

  describe('hint (FR-008a)', () => {
    afterEach(() => vi.unstubAllGlobals());

    const stubHover = (hover: boolean) =>
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('hover') && hover,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }));

    it('tells a mouse to rest or right-click', async () => {
      stubHover(true);
      const { el } = await setUp();
      expect(el.querySelector('.hint')!.textContent).toContain('Pare o ponteiro sobre ela');
    });

    it('tells a finger to hold', async () => {
      stubHover(false);
      const { el } = await setUp();
      expect(el.querySelector('.hint')!.textContent).toContain('Toque e segure para ler o texto');
    });
  });

  describe('preview', () => {
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
      vi.spyOn(history, 'back').mockImplementation(() => undefined);
    });

    afterEach(() => {
      TestBed.resetTestingModule();
      vi.useRealTimers();
      vi.restoreAllMocks();
      HTMLDialogElement.prototype.showModal = originals.showModal;
      HTMLDialogElement.prototype.close = originals.close;
    });

    it('a resting mouse opens the popover; a click toggles under it; leaving closes it', async () => {
      const { fixture, el, tile } = await setUp();
      vi.useFakeTimers();
      tile('p01').dispatchEvent(pointerEvent('pointerenter', { pointerType: 'mouse' }));
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      const tooltip = el.querySelector('[role="tooltip"]')!;
      expect(tooltip.querySelector('h2')!.textContent).toBe('Card P01');
      expect(tile('p01').getAttribute('aria-describedby')).toContain(tooltip.id);
      expect(tooltip.textContent).toContain('Ativada no baralho');

      tile('p01').click();
      fixture.detectChanges();
      expect(tile('p01').getAttribute('aria-pressed')).toBe('false');
      expect(el.querySelector('[role="tooltip"]')!.textContent).toContain('Desativada no baralho');

      tile('p01').dispatchEvent(pointerEvent('pointerleave', { pointerType: 'mouse' }));
      vi.advanceTimersByTime(150);
      fixture.detectChanges();
      expect(el.querySelector('[role="tooltip"]')).toBeNull();
      expect(tile('p01').getAttribute('aria-describedby')).not.toContain('planar-preview-popover');
    });

    it('Shift+F10 opens the dialog; its toggle, Próxima and ✕ work', async () => {
      const { fixture, el, tile } = await setUp();
      tile('p06').dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true }));
      await fixture.whenStable();
      const dialog = () => el.querySelector('app-planar-preview-dialog');
      expect(dialog()!.querySelector('h2')!.textContent).toBe('Card P06');
      expect(dialog()!.querySelector('.position')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('New Set · 6 de 14');

      dialog()!.querySelector<HTMLButtonElement>('.toggle')!.click();
      await fixture.whenStable();
      expect(tile('p06').getAttribute('aria-pressed')).toBe('false');
      expect(el.querySelector('[aria-live="polite"]')!.textContent).toBe('13 de 14 cartas · 3 fenômenos');
      expect(dialog()!.querySelector('.toggle')!.textContent!.trim()).toBe('Ativar carta');

      dialog()!.querySelector<HTMLButtonElement>('[aria-label="Próxima carta"]')!.click();
      await fixture.whenStable();
      expect(dialog()!.querySelector('h2')!.textContent).toBe('Card F01');

      dialog()!.querySelector<HTMLButtonElement>('[aria-label="Fechar"]')!.click();
      await fixture.whenStable();
      expect(dialog()).toBeNull();
      expect(history.back).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(tile('f01'));
    });
  });
});

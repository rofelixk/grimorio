import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanarImageService } from '@services/planar-image.service';
import { PlanarSelectionService } from '@services/planar-selection.service';
import { PLANECHASE_DATA, PlanechaseCatalogService } from '@services/planechase-catalog.service';
import { PLANECHASE_RANDOM, PlanechaseGameService } from '@services/planechase-game.service';
import { PLANAR_DATA, PLANAR_RECORDS, PLANAR_TRANSLATIONS, scriptedRandom } from '@testing/planechase-fixtures';
import { PlanechaseDeck } from './planechase-deck';

const IDS = PLANAR_RECORDS.map((card) => card.id);

async function setUp({ game = false } = {}) {
  TestBed.configureTestingModule({
    imports: [PlanechaseDeck],
    providers: [
      provideRouter([]),
      { provide: PLANECHASE_DATA, useValue: () => Promise.resolve({ cards: PLANAR_DATA, translations: PLANAR_TRANSLATIONS }) },
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
    expect(selection.selection()!.disabledIds).toEqual(['f01']);
    expect(navigate).toHaveBeenCalledWith('/modes/planechase');
  });

  it('with a game, a changed deck asks first; Salvar e reiniciar starts over', async () => {
    const { el, service, selection, navigate, button, click, tile } = await setUp({ game: true });
    await click(tile('f01'));
    await click(button('Salvar'));
    expect(el.querySelector('[role="alertdialog"]')!.textContent).toContain('Salvar reinicia a partida em andamento.');
    expect(selection.selection()).toBeNull();

    await click(button('Salvar e reiniciar'));
    expect(selection.selection()!.disabledIds).toEqual(['f01']);
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
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanechaseGameService } from '@services/planechase-game.service';
import { PlanechaseRules } from './planechase-rules';

describe('PlanechaseRules', () => {
  const inProgress = signal(false);
  let game: Record<string, unknown>;

  beforeEach(() => {
    inProgress.set(false);
    // Any call beyond reading inProgress would change the game.
    game = { inProgress, start: vi.fn(), end: vi.fn(), reshuffle: vi.fn(), roll: vi.fn() };
    TestBed.configureTestingModule({
      imports: [PlanechaseRules],
      providers: [provideRouter([]), { provide: PlanechaseGameService, useValue: game }],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(PlanechaseRules);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the seven sections with a TOC entry each', async () => {
    const el = await render();
    expect(el.querySelector('h1')!.textContent).toBe('Como jogar');
    const titles = [...el.querySelectorAll('.rule h2')].map((h) => h.textContent);
    expect(titles).toEqual([
      'O que é',
      'Baralho compartilhado',
      'Início',
      'Controlador planar',
      'Dado planar',
      'Planeswalk',
      'Caos e fenômenos',
    ]);
    expect(el.querySelectorAll('.toc-link')).toHaveLength(7);
    expect(el.textContent).toContain('O botão Planeswalk troca de plano sem rolar o dado.');
  });

  it('says "Voltar" without a game and "Voltar à partida" with one, without touching the game', async () => {
    expect((await render()).querySelector('.back')!.textContent!.trim()).toBe('Voltar');
    inProgress.set(true);
    expect((await render()).querySelector('.back')!.textContent!.trim()).toBe('Voltar à partida');
    for (const key of ['start', 'end', 'reshuffle', 'roll']) {
      expect(game[key]).not.toHaveBeenCalled();
    }
  });
});

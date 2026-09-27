import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanechaseGameService } from '@services/planechase-game.service';
import { GameModes } from './game-modes';

describe('GameModes', () => {
  const inProgress = signal(false);

  beforeEach(() => {
    inProgress.set(false);
    TestBed.configureTestingModule({
      imports: [GameModes],
      providers: [provideRouter([]), { provide: PlanechaseGameService, useValue: { inProgress } }],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(GameModes);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('offers Planechase with "Abrir" when no game is waiting', async () => {
    const el = await render();
    expect(el.querySelector('h1')!.textContent).toBe('Modos de jogo');
    const row = el.querySelector('button')!;
    expect(row.getAttribute('aria-label')).toBe('Planechase. Um baralho de planos compartilhado pela mesa.');
    expect(row.textContent).toContain('Abrir');
  });

  it('says "Continuar" with a game in progress, and opens Planechase', async () => {
    inProgress.set(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const el = await render();
    const row = el.querySelector('button')!;
    expect(row.textContent).toContain('Continuar');
    row.click();
    expect(navigate).toHaveBeenCalledWith('/modes/planechase');
  });
});

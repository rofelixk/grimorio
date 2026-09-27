import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PlanechaseGameService } from '@services/planechase-game.service';
import { MODES } from '@utils/planechase-copy';
import { ActionRow } from '@shared/ds/action-row/action-row';

// "Modos de jogo" (FR-001): the gameplay menu, ungated. Planechase is its only mode so far; its
// verb says whether a game is waiting on this device.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-game-modes',
  imports: [ActionRow],
  templateUrl: './game-modes.html',
  styleUrl: './game-modes.scss',
})
export class GameModes {
  private readonly router = inject(Router);
  protected readonly inProgress = inject(PlanechaseGameService).inProgress;
  protected readonly copy = MODES;

  protected openPlanechase(): void {
    void this.router.navigateByUrl('/modes/planechase');
  }
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlanarControls } from '@shared/gameplay/planar-controls';

// The wide game console (DESIGN.md "Game console"): the die result as a live region, the game
// actions, and the inline confirm variant for "Reiniciar planos" / "Encerrar partida".
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planar-console',
  templateUrl: './planar-console.html',
  styleUrl: './planar-console.scss',
})
export class PlanarConsole extends PlanarControls {}

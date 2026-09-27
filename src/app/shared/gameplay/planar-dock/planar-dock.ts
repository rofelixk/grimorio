import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlanarControls } from '@shared/gameplay/planar-controls';

// The phone dock (DESIGN.md "Phone dock", R16): the console's controls, sticky at the bottom of the
// view so the result and the actions stay on screen without scrolling (FR-012a).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planar-dock',
  templateUrl: './planar-dock.html',
  styleUrl: './planar-dock.scss',
})
export class PlanarDock extends PlanarControls {}

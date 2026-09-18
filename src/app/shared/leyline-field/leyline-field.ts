import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SparkRerollDirective } from '@shared/spark-reroll/spark-reroll.directive';

// Purely decorative ambient background for the collection header — reads
// its identity colors from --collection-header-primary/-accent/-tertiary,
// set by the ancestor CollectionHeader host and inherited down through the
// DOM as plain custom properties (no inputs needed).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SparkRerollDirective],
  selector: 'app-leyline-field',
  styleUrl: './leyline-field.scss',
  templateUrl: './leyline-field.html',
})
export class LeylineField {
  // Same recipe as auth-modal/add-card-modal — index alone is enough for
  // the shared seed formula in _motion.scss to scatter each spark's initial
  // angle/timing; SparkRerollDirective takes over each spark's path from
  // there on every animation loop.
  protected readonly sparkIndices = Array.from({ length: 32 }, (_, i) => i);
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PROFILE } from '@utils/entry-copy';

// "Desvincular conta" (FR-014): no fields — the subtitle states the consequence, this line that
// nothing is deleted. The modal renders Cancelar and the danger verb.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-unlink-step',
  template: `<p class="note">{{ caption }}</p>`,
  styleUrl: '../profile-screen.scss',
})
export class UnlinkStep {
  protected readonly caption = PROFILE.steps.unlink.caption;
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MISC } from '@utils/entry-copy';
import { ProfileButton } from '@shared/auth/profile-button/profile-button';

// The app-shell top bar (DESIGN.md "App top bar"): the "Grimorio" wordmark and the temporary
// active-profile button. Identical at every width.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-top-bar',
  imports: [ProfileButton],
  template: `
    <span class="wordmark">{{ wordmark }}</span>
    <app-profile-button />
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      min-height: var(--touch-target);
      padding: 0 var(--space-4);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg);
    }

    .wordmark {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: var(--font-size-lg);
      line-height: 1;
      color: var(--role-primary);
      text-shadow: var(--glow-title);
    }
  `,
  host: { role: 'banner' },
})
export class TopBar {
  protected readonly wordmark = MISC.wordmark;
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SyncLineState = 'pending' | 'done' | 'failed';

// The sync line on success screens (DESIGN.md "Sync line"): a role-accent spinner while
// pending, a role-accent dot once done, and plain status text when the sync couldn't run —
// no success or warning colors (FR-041).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sync-line',
  template: `
    @switch (state()) {
      @case ('pending') {
        <span class="spinner" aria-hidden="true"></span>
      }
      @case ('done') {
        <span class="dot" aria-hidden="true"></span>
      }
    }
    <span>{{ label() }}</span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-sm);
    }

    .spinner {
      flex: none;
      width: 1em;
      height: 1em;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      color: var(--role-accent);
      animation: spin 0.6s linear infinite;
    }

    .dot {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--role-accent);
      box-shadow: 0 0 8px var(--role-accent);
    }
  `,
  host: { role: 'status' },
})
export class SyncLine {
  readonly state = input.required<SyncLineState>();
  readonly label = input.required<string>();
}

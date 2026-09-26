import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SyncDisplayKind } from '@utils/sync-status.util';

// The 8px sync-state mark (DESIGN.md "Sync area & sync mark"): each kind has its own shape or
// fill, so status never relies on color alone. Healthy kinds are neutral; only failures use
// danger, and identity colors never appear (FR-007a). Decorative: the label carries the meaning.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sync-mark',
  template: `
    @if (kind() === 'syncing') {
      <span class="spinner"></span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: var(--status-mark);
      height: var(--status-mark);
      border-radius: 50%;
      box-sizing: border-box;
    }

    :host(.is-synced) {
      background: var(--color-text);
      box-shadow: 0 0 8px rgb(from var(--color-text) r g b / 60%);
    }

    :host(.is-last) {
      background: var(--color-text-muted);
    }

    :host(.is-never) {
      border: 1px solid var(--color-text);
    }

    :host(.is-local) {
      border: 1px solid var(--color-text-muted);
    }

    :host(.is-failure) {
      background: var(--color-danger);
      box-shadow: 0 0 8px var(--color-danger);
    }

    :host(.is-syncing) {
      width: auto;
      height: auto;
    }

    .spinner {
      display: block;
      width: var(--font-size-xs);
      height: var(--font-size-xs);
      border: 1px solid var(--color-text-muted);
      border-right-color: transparent;
      border-radius: 50%;
      box-sizing: border-box;
      animation: spin 0.8s linear infinite;
    }
  `,
  host: {
    'aria-hidden': 'true',
    '[class.is-syncing]': "kind() === 'syncing'",
    '[class.is-synced]': "kind() === 'synced'",
    '[class.is-last]': "kind() === 'last'",
    '[class.is-never]': "kind() === 'never'",
    '[class.is-local]': "kind() === 'local'",
    '[class.is-failure]': "kind() === 'offline' || kind() === 'expired' || kind() === 'error'",
  },
})
export class SyncMark {
  readonly kind = input.required<SyncDisplayKind>();
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@models/profile.model';
import { IDENTITY_HEX } from '@utils/identity.util';

// The identity in the mobile modal header (DESIGN.md "Identity chip"): one dot per color plus
// "{P} · {Tribe}" (or just the tribe) in text.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-identity-chip',
  template: `
    @for (hex of dots(); track $index) {
      <span class="dot" [style.--hex]="hex" aria-hidden="true"></span>
    }
    <span class="label">{{ label() }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
      padding: 0 var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--hex);
      box-shadow: 0 0 6px var(--hex);
    }

    .label {
      font-size: var(--font-size-xs);
    }
  `,
})
export class IdentityChip {
  readonly colors = input.required<Color[]>();
  readonly label = input.required<string>();

  protected readonly dots = computed(() => this.colors().map((c) => IDENTITY_HEX[c].base));
}

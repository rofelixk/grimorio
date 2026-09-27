import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

let nextId = 0;

// An entry into a screen or an action step (DESIGN.md "Action rows"): one full-width button with
// a leading slot (mini wheel or spacer), title over meta, and a trailing micro-label verb. The
// danger variant only turns the title danger. Its accessible name is "{title}. {meta}.".
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-action-row',
  template: `
    <button
      type="button"
      class="row"
      [class.danger]="danger()"
      [disabled]="disabled()"
      [attr.aria-label]="label()"
      [attr.aria-describedby]="hint() ? hintId : null"
      (click)="activate.emit()"
    >
      <span class="lead" aria-hidden="true"><ng-content /></span>
      <span class="text" aria-hidden="true">
        <span class="title">{{ title() }}</span>
        <span class="meta">{{ meta() }}</span>
      </span>
      <span class="micro-label verb" aria-hidden="true">{{ verb() }}</span>
    </button>
    @if (hint()) {
      <span class="hint" [id]="hintId">{{ hint() }}</span>
    }
  `,
  styleUrl: './action-row.scss',
})
export class ActionRow {
  readonly title = input.required<string>();
  readonly meta = input.required<string>();
  readonly verb = input('');
  readonly danger = input(false);
  readonly disabled = input(false);
  /** Added to the description, e.g. why the row is disabled. */
  readonly hint = input('');
  readonly activate = output<void>();

  protected readonly hintId = `grm-row-hint-${nextId++}`;
  protected readonly label = computed(() => {
    const meta = this.meta();
    return `${this.title()}. ${meta}${meta.endsWith('.') ? '' : '.'}`;
  });
}

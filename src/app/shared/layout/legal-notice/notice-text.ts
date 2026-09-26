import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NoticeRun } from '@utils/entry-copy';

// Renders one NOTICE paragraph's runs: plain text, or links opened in a new tab with a 44px hit
// area that leaves the line box unchanged (FR-022).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notice-text',
  // Kept on one line: whitespace between the runs would render as a space before punctuation.
  template: `@for (run of runs(); track $index) {@if (isLink(run)) {<a [href]="run.href" target="_blank" rel="noopener">{{ run.text }}</a>} @else {{{ run }}}}`,
  styles: `
    a {
      display: inline-block;
      padding: 13px 0;
      margin: -13px 0;
      color: var(--role-accent);
      text-decoration: none;

      &:hover {
        color: var(--role-accent-hover);
        text-decoration: underline;
      }
    }
  `,
})
export class NoticeText {
  readonly runs = input.required<readonly NoticeRun[]>();

  protected isLink(run: NoticeRun): run is { text: string; href: string } {
    return typeof run !== 'string';
  }
}

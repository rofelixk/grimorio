import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NOTICE, SHELL } from '@utils/entry-copy';
import { NoticeText } from './notice-text';

// The legal and attribution notice at the end of every page (DESIGN.md "Legal notice", FR-027).
// Its copy is shared with the About view (FR-029).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-legal-notice',
  imports: [NoticeText],
  template: `
    <aside [attr.aria-label]="label">
      <p><app-notice-text [runs]="notice.wotc" /></p>
      <p><app-notice-text [runs]="notice.scryfall" /></p>
      <p>{{ notice.ai }}</p>
    </aside>
  `,
  styleUrl: './legal-notice.scss',
})
export class LegalNotice {
  protected readonly notice = NOTICE;
  protected readonly label = SHELL.notice;
}

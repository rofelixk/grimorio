import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NOTICE } from '@utils/entry-copy';
import { NoticeText } from '@shared/layout/legal-notice/notice-text';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-about',
  imports: [NoticeText],
  styleUrl: './about.scss',
  templateUrl: './about.html',
})
export class About {
  // The WotC and Scryfall paragraphs come from the shell's legal notice copy (FR-029).
  protected readonly notice = NOTICE;
}

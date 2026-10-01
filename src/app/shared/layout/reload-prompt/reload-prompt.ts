import { ChangeDetectionStrategy, Component, InjectionToken, inject } from '@angular/core';
import { IdentityService } from '@services/identity.service';
import { CompactModal } from '@shared/ds/compact-modal/compact-modal';
import { DATA } from '@utils/entry-copy';

/** Reloads the page; specs swap it (jsdom can't reload). */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => () => location.reload(),
});

// Another copy opened a newer version of the app's data (spec 011 ui.md §2, FR-009). This copy
// must not keep using a database whose schema it doesn't know, so the prompt is locked for good:
// Esc, the backdrop and ✕ do nothing, and the only way on is "Recarregar".
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-reload-prompt',
  imports: [CompactModal],
  templateUrl: './reload-prompt.html',
  styleUrl: './reload-prompt.scss',
})
export class ReloadPrompt {
  protected readonly roles = inject(IdentityService).roles;
  protected readonly copy = DATA.reload;
  protected readonly titleId = 'grm-reload-title';
  protected readonly reload = inject(PAGE_RELOAD);
}

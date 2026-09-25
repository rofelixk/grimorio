import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ProfileSummary } from '@models/profile.model';
import { ACTION, LINK_STATE, MISC } from '@utils/entry-copy';
import { IDENTITY_HEX, tribeName } from '@utils/identity.util';
import { MiniWheel } from '../mini-wheel/mini-wheel';

// A profile list row (DESIGN.md "Profile list rows"): a full-width button inside a listitem
// with the mini wheel, name and "{Tribe} · link state". The active profile is outlined in its
// own primary color, badged "Em uso" and can't be picked. `dashed` is the "+ Criar novo
// perfil" row.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile-row',
  imports: [MiniWheel],
  templateUrl: './profile-row.html',
  styleUrl: './profile-row.scss',
  host: { role: 'listitem' },
})
export class ProfileRow {
  readonly profile = input<ProfileSummary | null>(null);
  readonly active = input(false);
  readonly dashed = input(false);
  readonly picked = output<void>();

  protected readonly createLabel = ACTION.createRow;
  protected readonly inUse = MISC.inUse;

  protected readonly meta = computed(() => {
    const profile = this.profile();
    if (!profile) {
      return '';
    }
    return `${tribeName(profile.colors)} · ${profile.cloud ? LINK_STATE.linked : LINK_STATE.local}`;
  });

  protected readonly ownHex = computed(() => {
    const primary = this.profile()?.colors[0];
    return primary ? IDENTITY_HEX[primary].base : null;
  });

  protected pick(): void {
    if (!this.active()) {
      this.picked.emit();
    }
  }
}

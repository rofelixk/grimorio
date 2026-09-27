import { Color } from '@models/profile.model';
import { sameColors } from './identity.util';

export interface LocalIdentity {
  colors: Color[];
  colorsUpdatedAt: string;
  name: string;
  nameUpdatedAt: string;
}

/** What the account's `user_metadata` holds (spec 005 data-model §2). */
export interface RemoteIdentity {
  colors?: Color[];
  colorsAt?: string;
  labelAt?: string;
}

export interface IdentityWrite {
  grm_colors?: Color[];
  grm_colors_at?: string;
  grm_label?: string;
  grm_label_at?: string;
}

export interface IdentityResult {
  /** The account's newer colors, with their own timestamp (retint silently). */
  adoptColors: { colors: Color[]; at: string } | null;
  /** What to write to the account's metadata in one `updateUser`, if anything. */
  write: IdentityWrite | null;
}

// The sync identity step's decision (research R6, FR-012a). Colors are last-write-wins on their
// timestamps — an absent `grm_colors_at` counts as older than any local change — and equal
// colors need nothing. The label is written only when the local rename is newer; the remote
// label is never adopted as the local name.
export function reconcileIdentity(local: LocalIdentity, remote: RemoteIdentity): IdentityResult {
  let adoptColors: IdentityResult['adoptColors'] = null;
  const write: IdentityWrite = {};

  if (!sameColors(local.colors, remote.colors)) {
    if (remote.colors?.length && remote.colorsAt && remote.colorsAt > local.colorsUpdatedAt) {
      adoptColors = { colors: [...remote.colors], at: remote.colorsAt };
    } else {
      write.grm_colors = [...local.colors];
      write.grm_colors_at = local.colorsUpdatedAt;
    }
  }

  if (!remote.labelAt || local.nameUpdatedAt > remote.labelAt) {
    write.grm_label = local.name;
    write.grm_label_at = local.nameUpdatedAt;
  }

  return { adoptColors, write: Object.keys(write).length ? write : null };
}

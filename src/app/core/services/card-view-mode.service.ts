import { Injectable, inject, linkedSignal } from '@angular/core';
import { ProfileSessionService } from './profile-session.service';

export type CardViewMode = 'images' | 'details';

const KEY_PREFIX = 'grm-card-view:';
const DEFAULT_MODE: CardViewMode = 'details';

function storageKey(profileId: string | null): string {
  return `${KEY_PREFIX}${profileId ?? ''}`;
}

function read(profileId: string | null): CardViewMode {
  try {
    const value = localStorage.getItem(storageKey(profileId));
    return value === 'images' || value === 'details' ? value : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

// The collection page's display mode, per profile on this device (spec 015, R18): a cosmetic
// preference like `grm-nav-pinned`, never synced, removed when the profile is deleted.
@Injectable({ providedIn: 'root' })
export class CardViewModeService {
  private readonly session = inject(ProfileSessionService);
  private readonly profileId = () => this.session.active()?.id ?? null;

  /** Re-reads from storage whenever the active profile changes. */
  readonly mode = linkedSignal<CardViewMode>(() => read(this.profileId()));

  set(mode: CardViewMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(storageKey(this.profileId()), mode);
    } catch {
      // The choice still holds for this session.
    }
  }

  forget(profileId: string): void {
    try {
      localStorage.removeItem(storageKey(profileId));
    } catch {
      // Nothing stored that could be removed.
    }
  }
}

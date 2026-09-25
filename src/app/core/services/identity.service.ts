import { Injectable, computed, inject } from '@angular/core';
import { Color } from '@models/profile.model';
import { DEFAULT_IDENTITY, Roles, rolesFor } from '../utils/identity.util';
import { ProfileSessionService } from './profile-session.service';

// The active profile's color identity, or the default R → U → G with no profile (FR-012,
// the Default Rule). The app root binds `roles()` as its --theme-* properties (R13).
@Injectable({ providedIn: 'root' })
export class IdentityService {
  private readonly session = inject(ProfileSessionService);

  /** `null` = no active profile. */
  readonly activeColors = computed<Color[] | null>(() => this.session.active()?.colors ?? null);

  readonly roles = computed<Roles>(() => rolesFor(this.activeColors() ?? DEFAULT_IDENTITY));
}

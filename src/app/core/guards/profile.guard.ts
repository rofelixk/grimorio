import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';

function isSessionChange(info: unknown): boolean {
  return !!info && typeof info === 'object' && (info as { sessionChange?: unknown }).sessionChange === true;
}

// Gates every route that reads or changes owned-card data (FR-001, R12). With no active profile
// it opens the entry modal and waits: if a profile became active the navigation continues;
// otherwise the person stays where they were, or lands on Home when they arrived directly.
export const profileGuard: CanActivateFn = async () => {
  const session = inject(ProfileSessionService);
  const router = inject(Router);
  const entryModal = inject(EntryModalService);
  if (session.active()) {
    return true;
  }
  // Re-guarding after a sign-out or switch (ProfileSessionService): the modal is already
  // showing, so just leave the gated page.
  if (isSessionChange(router.currentNavigation()?.extras.info)) {
    return router.parseUrl('/');
  }
  const initial = !router.navigated;
  const { activeProfileId } = await entryModal.open();
  if (activeProfileId) {
    return true;
  }
  return initial ? router.parseUrl('/') : false;
};

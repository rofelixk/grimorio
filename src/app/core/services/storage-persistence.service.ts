import { Injectable, Injector, inject } from '@angular/core';
import { ProfileStore } from './profile-store.service';

// Asks the browser to keep this device's data under storage pressure (FR-006, research R3): when a
// profile is created, and at startup once the device has profiles. Silent and fire-and-forget:
// whatever the browser decides, nothing changes for the person (FR-007).
@Injectable({ providedIn: 'root' })
export class StoragePersistenceService {
  // Read lazily: ProfileStore itself requests on create.
  private readonly injector = inject(Injector);

  /** Never rejects and never awaited by callers. 'startup' needs ≥1 profile (FR-006, FR-007). */
  async request(trigger: 'startup' | 'created'): Promise<void> {
    try {
      const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
      if (!storage?.persist) {
        return;
      }
      if (await storage.persisted()) {
        return;
      }
      if (trigger === 'startup' && this.injector.get(ProfileStore).profiles().length === 0) {
        return;
      }
      await storage.persist();
    } catch {
      // The request is best-effort; a browser that refuses or throws changes nothing.
    }
  }
}

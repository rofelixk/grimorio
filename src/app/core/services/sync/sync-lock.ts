import { InjectionToken } from '@angular/core';

/** Runs `fn` while holding the device-wide sync lock; resolves or rejects with it. */
export type SyncLock = <T>(fn: () => Promise<T>) => Promise<T>;

/**
 * One copy of the app syncs at a time (FR-014a, research R6): the Web Locks API, released on its
 * own if the copy closes mid-sync. Without it, `fn` runs at once.
 */
export const SYNC_LOCK = new InjectionToken<SyncLock>('SYNC_LOCK', {
  providedIn: 'root',
  factory: () => (fn) =>
    typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('grimorio-sync', fn) : fn(),
});

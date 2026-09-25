import { deleteDB } from 'idb';

const LEGACY_DB_NAME = 'grimorio';
const LEGACY_LOCAL_STORAGE_KEYS = ['grimorio.themeColors', 'sb-hyzbkxraanzhdyhtnadf-auth-token'];
// A legacy tab still holding the old database open would block deletion indefinitely; startup
// never waits on that — the next launch retries.
const DELETE_TIMEOUT_MS = 1000;

// One-time, idempotent clean start (R2): removes the pre-profile `grimorio` database, the
// legacy theme preference and the legacy global Supabase session, so nothing from before
// profiles existed can show data or colors that belong to no active profile. Safe to run on
// every launch — each step is a no-op once done.
export async function runLegacyCleanup(): Promise<void> {
  for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage unavailable (e.g. blocked) — nothing to clean.
    }
  }
  try {
    await Promise.race([
      deleteDB(LEGACY_DB_NAME),
      new Promise<void>((resolve) => setTimeout(resolve, DELETE_TIMEOUT_MS)),
    ]);
  } catch {
    // IndexedDB unavailable — nothing to clean.
  }
}

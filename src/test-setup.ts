import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { resetDeviceDbForTests } from './app/core/db/device-db';
import { unbindProfileDbForTests } from './app/core/db/entity-store';
import { resetAllGrimorioDbsForTests } from './app/core/db/profile-db';

// PBKDF2 (password-hash.util) needs WebCrypto; fall back to Node's if jsdom lacks it.
if (!globalThis.crypto?.subtle) {
  // A variable specifier keeps the spec tsconfig (no Node types) from resolving the module.
  const nodeCrypto = 'node:crypto';
  const { webcrypto } = (await import(/* @vite-ignore */ nodeCrypto)) as { webcrypto: Crypto };
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

// Global reset so every spec starts with no profiles, no bound profile database and empty
// `grimorio-*` IndexedDB databases.
beforeEach(async () => {
  unbindProfileDbForTests();
  await resetDeviceDbForTests();
  await resetAllGrimorioDbsForTests();
});

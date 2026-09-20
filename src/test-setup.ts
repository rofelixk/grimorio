import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { resetGrimorioDbForTests } from './app/core/db/grimorio-db';

// Global reset so every spec that touches CardService/StorageLocationService/
// DeckService (directly or via a component) starts from an empty IndexedDB,
// mirroring the localStorage.clear() every such spec already does per-test.
beforeEach(async () => {
  await resetGrimorioDbForTests();
});

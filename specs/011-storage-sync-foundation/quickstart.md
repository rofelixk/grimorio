# Quickstart: Storage & Sync Foundation

These scenarios prove the feature end to end. The contracts are in [contracts/services.md](contracts/services.md), the shapes in [data-model.md](data-model.md).

## Prerequisites

- The dev server running (`npm start`, which the maintainer starts). For scenario 4, use `npm run serve:pwa` for the installed-app case.
- A Chromium browser.
- For scenario 6, a linked test cloud account.

## Automated

```bash
npm test        # full suite, via the test-runner agent
npm run lint
npm run build   # budgets unchanged
```

The specs must cover:

- `WriteQueue`: order, failure isolation, `flush` after a failure, `run` vs `enqueue` reporting, and `before`.
- Each of the five services toasting once on a forced failure (SC-001). `remove()` on collections and decks rejects with no toast.
- `isClosedConnectionError` failures not toasting.
- `fake-indexeddb`: a second connection at version +1 makes the first close and emit `upgrade`. `deleteDB` of the bound profile makes it close, emit `deleted`, and refuse to reopen.
- `CrossTabService` with a fake channel pair: profile matching, device kinds, ignoring its own source, and no channel.
- `refresh()` per service not clearing the signal, and losing to a newer `load()`.
- `fetchAll`:
  - 2,500 rows in 3 pages (SC-005);
  - exactly 2,000 rows in 2 pages;
  - a server that caps at 500 still reads all;
  - a cancel between pages throws `Superseded`, with nothing upserted.
- `sync.service.spec.ts` passing with only its mocks extended (FR-021), plus the lock serializing two `syncNow` runs from two service instances.
- `StoragePersistenceService`'s decision table (FR-006/FR-007).

## Manual

1. **A failed save shows a toast** (US1).
   - In DevTools → Application → Storage, set a tiny custom quota, or in the console patch `IDBObjectStore.prototype.put` to throw.
   - Create a collection.
   - Expected: the "Dados" toast. Removing the patch, the next change saves silently.

2. **Two copies stay in step** (US2-1/2/3).
   - Open two tabs on the same profile.
   - In tab A: create, rename and delete a collection; create a deck; delete a collection with "Excluir as cartas"; change the planar deck selection; start and roll a Planechase game.
   - Expected: tab B shows each change within 2 s (SC-003), with no reload.

3. **Different profiles stay isolated** (US2-4).
   - Tab A on profile P, tab B on profile Q. Create a deck in A.
   - Expected: B's decks are untouched, and B never re-reads its data.

4. **A newer version takes over** (US2-5, SC-004).
   - Keep a tab open on the current build.
   - Temporarily bump `DB_VERSION` in `profile-db.ts` to 4 (no store change needed), rebuild and open a second tab.
   - Expected: the new tab loads within 2 s, and the old tab shows the locked reload prompt: Esc, the backdrop and ✕ do nothing, and "Recarregar" reloads.
   - Revert the bump.

5. **Persistent storage** (US4).
   - Fresh Chromium profile, then create the first profile. `await navigator.storage.persisted()` in the console reflects Chromium's decision, and no error shows either way.
   - Reload. If not persisted, the request repeats silently.
6. **Deleted in another window** (FR-010).
   - Two tabs on profile P. In A, delete P from the profile modal.
   - Expected: A's deletion finishes without hanging. B shows "Este perfil foi excluído em outra janela." and returns to no profile (the entry modal on a gated route). P is absent from B's profile list, and its database isn't recreated (DevTools → IndexedDB).

7. **Large account** (US3, SC-005).
   - Seed more than 1,000 `card_entries` rows for the test account, through the Supabase SQL editor or the MCP `execute_sql` against a **test** account only.
   - Sync on a fresh profile linked to it. Expected: every row arrives locally.
   - Sync again. Expected: 0 upserts (Network tab: no `POST` to `card_entries`).
   - Edit row #1,500 remotely, then sync. Expected: the remote edit wins.

8. **One sync at a time** (FR-014a).
   - Two tabs on the same linked profile. Press sync in both quickly.
   - Expected: both show "syncing", the Network tab shows the second run's requests starting only after the first's end, and both end as done.

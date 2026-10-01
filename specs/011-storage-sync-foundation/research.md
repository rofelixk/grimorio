# Research: Storage & Sync Foundation

All Technical Context unknowns are resolved below. Each entry: Decision, Rationale, Alternatives considered.

## R1. One write queue class, owned per service

**Decision**: A framework-agnostic `WriteQueue` class in `core/db/write-queue.ts`. Each service keeps its own instance (FR-001). It has two ways in:

- `enqueue(task, onLanded?)`: fire-and-forget. A failure goes to the queue's `onError`, and the chain continues (FR-003).
- `run(task)`: returns the task's promise. A failure rejects to the caller only, and the chain continues. This is for saves whose caller reports its own error (FR-005): `CollectionService.remove`, `DeckService.remove` and every `ProfileStore` write.

`flush()` resolves once every task queued so far has settled, success or failure (FR-004). An optional `before` hook runs ahead of each task, so `CollectionService` keeps waiting on `CardService.flush()`.

An injectable `SaveQueueService` (`core/services/save-queue.service.ts`) builds the queues for the five entity services. Its `onError` logs `Grimorio: failed to persist {label}.` and shows the save-failure toast (R2). `ProfileStore` builds a plain `WriteQueue` with no reporter, because all its writes go through `run()`.

**Rationale**: The five copies differ only in their log label and, for collections, the `cards.flush()` prefix. A class with an injected reporter keeps `core/db` free of Angular and lets specs build a queue with a spy. `ProfileStore`'s existing `enqueueWrite<T>` already has `run()`'s shape, so it uses the same class.

**Alternatives considered**: A single app-wide queue. Rejected: it would serialize unrelated saves (FR-001 keeps them independent), and a slow card `replaceStore` would delay a Planechase roll. A base class the services extend. Rejected: the services differ too much (device vs. profile targets, `load` vs. `whenReady`), and composition matches the codebase's style.

## R2. Save-failure toast, and when it stays silent

**Decision**: `ToastService.show(DATA.saveFailed.label, DATA.saveFailed.text)`, with label "Dados" and text "Não foi possível salvar a alteração neste aparelho." The existing one-toast rule covers bursts: each failure replaces the previous toast (US1-4).

The reporter stays silent for an `InvalidStateError` `DOMException` (`isClosedConnectionError`, `core/db/connection-events.ts`). That error only happens when a connection this copy closed because another copy took over the database (R4). The takeover has its own message (the reload prompt, or the "deleted in another window" toast), and a save toast would replace it.

**Rationale**: Since R4, the app's own code never uses a connection it closed itself:
- profile switches flush before closing;
- `deleteProfileDb` runs after the sign-out;
- the test reset closes connections first.

So "closed connection" means "taken over" in practice.

**Alternatives considered**: A "taken over" flag checked by the reporter. Rejected: deleted-elsewhere and version-change would each need their own scoping, and the error check covers both. A toast per kind of data ("Cartas", "Coleções"…). Rejected: the person can't act on the difference, and the spec asks for one message.

## R3. Persistent storage request

**Decision**: `StoragePersistenceService.request(trigger: 'startup' | 'created')`, always fire-and-forget (`void`), with every failure swallowed (FR-007). Rules:

1. Skip if `navigator.storage?.persist` is missing.
2. Skip if `await navigator.storage.persisted()` is already `true` (US4-4).
3. `'startup'`: skip if the device has no profile.
4. Otherwise call `navigator.storage.persist()` and ignore the result.

`'startup'` is called from the app initializer after `store.whenReady()`, not awaited. `'created'` is called from `ProfileStore.create` after the record's write lands. That covers both creation paths (the entry modal and the cloud `setupFromPending`).

**Rationale**: Every browser is treated the same, with no browser detection. Chromium (desktop, Android and the Capacitor WebView) grants or denies silently, from engagement and install state; an installed PWA is normally granted. Whatever a browser does with the request is its own business: the app ignores the result (FR-007).

**Alternatives considered**: Request only on creation. Rejected: the spec's assumption, since existing devices would never reach that moment. A visible "keep data" setting. Rejected: out of scope, and the spec wants no UI.

## R4. Closing connections when another copy takes over

**Decision**: Both `openDB` calls pass idb's `blocking(currentVersion, blockedVersion)` callback.

- **Device DB** (`device-db.ts`): close the connection, and keep the memoized promise. Later calls then hit the closed connection and fail silently (R2). Then emit `{ kind: 'upgrade' }`.
- **Profile DB** (`profile-db.ts`):
  - **Deleted elsewhere** (`blockedVersion === null`): close the connection, drop it from `connections`, and add the id to a `goneProfileIds` set. `openProfileDb(id)` then rejects for that id with `ProfileGoneError`, never recreating the database (FR-010). Emit `{ kind: 'deleted', profileId }`.
  - **Upgrade** (a higher version): close, keep the memo, emit `{ kind: 'upgrade' }`.

`connection-events.ts` holds a module-level listener set:
- `onTakeover(listener)` returns an unsubscribe function;
- `emitTakeover(event)`;
- the test reset clears the set and `goneProfileIds`.

`StorageHealthService` (root, constructed by `App`) subscribes:
- **`upgrade`** sets `reloadRequired` to true, which mounts the reload prompt (FR-009).
- **`deleted`** for the active profile shows `DATA.deletedElsewhere` and calls `ProfileSessionService.signOut()`. Gated routes then open the entry modal through the existing re-guard. A `deleted` event for a profile this copy doesn't have open is ignored, though only the bound profile's connection can receive one anyway.

`ProfileStore` rehydrates from the `profiles` announcement (R5), so the deleted profile also leaves this copy's list.

**Rationale**: The `versionchange` event (idb's `blocking`) is the browser's only signal for "another connection wants this database". Closing right away unblocks the other copy at once (FR-008, SC-004), and also unblocks `deleteProfileDb` in the deleting copy, which today would hang until the other tab closed. Keeping the closed device connection memoized means no code path can open it again at the old version. A newer version would fail with `VersionError` anyway, and the reload prompt is already up.

`blockedVersion === null` is how IndexedDB signals deletion: `newVersion` is null on a delete request.

**Alternatives considered**: Reopening the database after a version change. Rejected: this copy's code doesn't know the new schema (FR-009). Reacting in `terminated`. Rejected: it fires only on abnormal closes, never on `versionchange`.

## R5. Cross-copy change announcements

**Decision**: `CrossTabService` (root) wraps one `BroadcastChannel('grimorio-data')`, created through the `CROSS_TAB_CHANNEL` injection token. The factory returns `null` when `typeof BroadcastChannel === 'undefined'`, and then the service does nothing (FR-015).

- **The message**: `{ source, kind, profileId }` ([data-model.md](data-model.md)). `source` is a per-copy random id; a copy never receives its own posts anyway, and the id is a cheap guard for tests.
- **Sending**: services call `announce(kind, profileId)` from the queue's `onLanded`, or after `run()` resolves. The announcement goes out only once the write has committed, so a receiver never reads ahead of it. The `profileId` is captured with the db handle when the write is queued (`boundProfileId()`, new in `entity-store.ts`).
- **Receiving**: `on(kind, handler)`. Profile-scoped kinds (`cards`, `collections`, `decks`, `planarSelection`) are delivered only when `message.profileId === boundProfileId()` (FR-013). `planarSelection` with `profileId: null` means the device selection, which matches only a copy with no profile open. Device kinds (`planechaseGame`, `profiles`) are always delivered (FR-012).
- **Rehydrating**: each service gets `refresh()`. It awaits its own `flush()`, re-reads its data from its current target, and sets the signal only if no `load()` started meanwhile (it reads `loadGeneration` without bumping it). It never clears the signal first (no flash), never bumps `changeCount`, and never writes. `ProfileStore.refresh()` re-reads `profiles`.
- **Sync**: results reach other copies with no extra code (FR-014), because `applySyncResult` and `resolveMixedCollections` save through the same queues. Tombstone writes and `lastSyncedAt` aren't announced: no other copy holds them in memory except the sync time label, which updates on that copy's next profile change or sync.

**Rationale**: BroadcastChannel works in every target: Chromium, Firefox, Safari 15.4+ and the Android WebView. It reaches every same-origin context, so the installed PWA and a browser tab share it. Announcing the kind but not the data keeps IndexedDB as the only source of truth, which is the spec's "receivers reload from the device".

**Alternatives considered**: The `storage` event on localStorage. Rejected: it's a hack, and it carries strings through a synchronous store. A SharedWorker owning IndexedDB. Rejected: too large, and absent on Android Chrome. Shipping row diffs in messages. Rejected: two sources of truth, and races with the queue.

## R6. One sync at a time across copies

**Decision**: The `SYNC_LOCK` injection token (`core/services/sync/sync-lock.ts`) defaults to `navigator.locks.request('grimorio-sync', fn)`. When `navigator.locks` is missing, it falls back to calling `fn` directly.

`SyncService.run()` sets `'syncing'` before asking for the lock, so a waiting copy already shows the syncing state (FR-014a). The lock callback holds the existing `Promise.race([exchange, timeout])`. The 60 s bound therefore applies once the lock is held, and the lock is released when the race settles, timeout included. On acquiring the lock the run checks `isCurrent` first, so a profile switch while it waited ends it as `'skipped'`.

Specs provide a fake lock that serializes in memory.

**Rationale**: The Web Locks API is the platform's cross-tab mutex. A tab that closes mid-sync releases its lock automatically, which no BroadcastChannel handshake can guarantee. It's supported everywhere BroadcastChannel is.

**Alternatives considered**: A BroadcastChannel "sync started/ended" protocol. Rejected: a crashed tab leaves it stuck. A lock per profile. Rejected: the spec says one copy on the device, and two profiles never sync at once in practice.

## R7. Paged cloud reads

**Decision**: `fetchAll(build, ctx)` in `core/services/sync/sync-remote.ts`. Each request:

- is `build().order('id').range(from, from + PAGE_SIZE - 1).abortSignal(signal)` with `PAGE_SIZE = 1000`;
- uses `select(cols, { count: 'exact' })`, so the response carries the account's total row count;
- advances `from` by the rows actually returned.

Reading stops when the rows read reach `count`, or when a page comes back empty (the fallback when `count` is null). After each page it calls `ensureCurrent()`, so a cancelled run throws `Superseded` before anything is reconciled (FR-018).

It's used for `collections`, `decks` and `card_entries`. `planechase_selections` keeps its single-row read.

**Rationale**:
- `order('id')` is needed for stable pages: without an ORDER BY, Postgres may return rows in a different order per request, skipping or repeating some. `(user_id, id)` is the primary key, so the order is index-backed.
- Stopping on `count` rather than on "a page shorter than 1000" keeps a server with a lower `max_rows` correct (spec edge case). Advancing by rows returned means a lower limit only adds requests.
- A typical small account still needs one request per table.

**Alternatives considered**:
- Stopping on the first short page. Rejected: a server limit below 1000 would drop rows silently.
- Always reading until an empty page. Rejected: an extra request per table on every sync, for no gain over `count`.
- Keyset pagination (`gt('id', last)`). Equivalent, but it needs one more filter in the mock and in every query, and the reconciler gains nothing.

## R8. SyncService split

**Decision**: `core/services/sync.service.ts` stays the orchestrator and public entry. It keeps the same exports, state, `start`, `profileChanged`, `syncNow`, the lock, the timeout, the error classification, the order, `syncedAt` and `lastSyncedAt`.

Steps live in `core/services/sync/`, each an `@Injectable({ providedIn: 'root' })` class with `run(ctx: SyncStepContext): Promise<void>`:

| File | Holds |
|---|---|
| `sync-run.ts` | `Run`, the `AuthExpired`/`Offline`/`Superseded` errors, `SyncStepContext` |
| `sync-rows.ts` | row interfaces and to/from mappers for cards, collections, decks |
| `sync-remote.ts` | `fetchAll`, `upsertRows`, `deleteRows` (the repeated `{ error }` checks) |
| `sync-lock.ts` | `SYNC_LOCK` (R6) |
| `identity-sync.step.ts` | account metadata ↔ profile colors/label |
| `collections-sync.step.ts` | pull, reconcile, `repairCollectionTree`, upload, apply, clear tombstones |
| `decks-sync.step.ts` | pull, reconcile, `repairDeckNames`, upload, apply, clear tombstones |
| `cards-sync.step.ts` | pull, reconcile, upload, apply, clear tombstones |
| `planar-selection-sync.step.ts` | flush, single-row pull, LWW, upsert or apply |

The orchestrator's `exchange` reads as the list: account lookup → identity → flush → collections → decks → cards → `syncedAt` + `resolveMixedCollections` → planar selection → `lastSyncedAt`.

`resolveMixedCollections` stays in the orchestrator. It is a cross-entity fix keyed on `syncedAt`, which the orchestrator owns, and moving it into the cards step would hide the ordering contract (spec 008 R6).

`sync.service.spec.ts` keeps driving `SyncService` end to end with the mocked client (FR-021). Its query mocks gain `order`/`range` and a `count`. New specs cover `fetchAll`.

**Rationale**: This is the smallest cut that makes each step self-contained (FR-019) without changing the public surface `SyncStatusService`, `App` and the specs depend on. Each step lands well under ~200 lines (SC-006). Today's ~620 lines are about 130 of mappers, 150 of orchestration and 340 of steps.

**Alternatives considered**: A generic "entity sync step" parameterized by table and mapper. Rejected: the three steps differ in their repair passes, and a generic one would push the differences into callbacks, harder to read than three short classes. Moving the spec into per-step files now. Optional (FR-021 MAY), and deferred: the end-to-end spec is what proves "identical behavior".

## R9. Reload prompt

**Decision**: A new `ReloadPrompt` component (`shared/layout/reload-prompt/`), mounted in `app.html` under `@if (storageHealth.reloadRequired())`. It is a `CompactModal` with `locked` always true, a heading and subtitle, and one primary "Recarregar" button marked `data-autofocus`, which calls `location.reload()` through the `PAGE_RELOAD` injection token (jsdom can't reload). The copy goes in `entry-copy.ts` next to the other app-shell copy. See [ui.md](ui.md).

**Rationale**: Clarification 1 fixed the shape, and it reuses the delete dialogs' heading/actions recipe, so there's nothing new for DESIGN.md.

**Alternatives considered**: An inline banner. Rejected by the clarification.

## R10. Tests in jsdom

**Decision**:
- **BroadcastChannel**: `CROSS_TAB_CHANNEL` is replaced by an in-memory fake pair (`@testing/cross-tab`), so two "copies" can be simulated in one spec.
- **Version-change and deletion**: tested against `fake-indexeddb`. A spec opens a second raw connection at a higher version, or calls `deleteDB`, and asserts the first closes, the event is emitted, and the open or delete resolves.
- **Failures**: a task that rejects, through `WriteQueue` directly and through each service with a stubbed `writeRows`/`replaceStore` or device-DB `put`.
- **The lock**: `SYNC_LOCK` is a fake.
- **Persistence**: `navigator.storage` is stubbed per spec.
- **Reset**: the global test reset also calls `resetConnectionEventsForTests()`.

**Rationale**: Every browser API this feature adds sits behind a token or a module function, following the codebase's rule that anything a spec must swap is injectable (architecture.md, `core/utils/`).

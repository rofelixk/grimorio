---

description: "Task list for 011 Storage & Sync Foundation"
---

# Tasks: Storage & Sync Foundation

**Input**: Design documents from `specs/011-storage-sync-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/services.md, ui.md, quickstart.md

**Tests**: Requested. `quickstart.md` § Automated lists the specs that must exist, and FR-021 requires the existing sync suite to keep passing with only its mocks extended. Each story writes its specs alongside its implementation.

**Organization**: Tasks are grouped by user story. Shared plumbing that more than one story needs (`WriteQueue`, `connection-events.ts`, the `DATA` copy, `sync-run.ts`) is in **Foundational**. Paging (US3) and the step split (US5) both build on `sync/sync-run.ts`; US3 lands `fetchAll` inside today's `SyncService` methods, and US5 then moves those methods into steps.

**Agents** (CLAUDE.md): every `npm test` / `npm run lint` / single-spec run goes through **`test-runner`**. After any task touching `.html`/`.scss`/component `.ts`, and before reporting the feature complete, run **`design-auditor`** and fix what it reports. The dev server is the user's; never start or stop it. Edit existing files only with the Edit tool (mixed CRLF/LF repo). No design handoff for this spec: ui.md is final.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

- [X] T000 Before any other task, check out `feature/011-storage-sync-foundation` from `main` and make its first commit: every uncommitted file under `specs/011-storage-sync-foundation/` (today `tasks.md`; there is no design handoff folder for this spec), and nothing else.

---

## Phase 1: Setup

**Purpose**: None needed. No dependency, config or folder change is required up front (plan: "Primary Dependencies: none new"). The `core/services/sync/` folder is created by T004.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared pieces US1, US2, US3 and US5 build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 [P] Create `src/app/core/db/write-queue.ts` exactly per contracts/services.md § `write-queue.ts` and data-model.md § Write queue: `WriteQueueOptions { before?: () => Promise<unknown>; onError?: (error: unknown) => void }`; `class WriteQueue` with a private `tail: Promise<unknown>`. `enqueue(task, onLanded?)` appends `before?.()` then `task()`, calls `onLanded` after success only, sends a failure to `onError` and keeps the chain alive (FR-003). `run<T>(task)` appends the same way (with `before`), returns a promise that resolves or rejects with the task, never calls `onError`, and keeps the chain alive (FR-005). `flush()` resolves once every task queued so far has settled, success or failure, and never rejects (FR-004). No Angular imports (core/db stays framework-free).
- [X] T002 [P] Write `src/app/core/db/write-queue.spec.ts`: tasks run in order, one at a time; a failing `enqueue` task calls `onError` once and the next task still runs; `flush()` resolves after a failure; `run()` rejects to its caller with no `onError` call and later tasks still run; `onLanded` runs after success only; `before` is awaited ahead of every task (both `enqueue` and `run`).
- [X] T003 [P] Create `src/app/core/db/connection-events.ts` per contracts/services.md § `connection-events.ts` and research R2/R4: `type TakeoverEvent = { kind: 'upgrade' } | { kind: 'deleted'; profileId: string }`; a module-level listener `Set`; `onTakeover(listener)` returning an unsubscribe function; `emitTakeover(event)`; `isClosedConnectionError(error)` = `error instanceof DOMException && error.name === 'InvalidStateError'`; `resetConnectionEventsForTests()` clearing the listeners (the gone ids live in `profile-db.ts` and are cleared by its own test reset, T018). Add `src/app/core/db/connection-events.spec.ts` covering subscribe/unsubscribe, emit to every listener, `isClosedConnectionError` true only for an `InvalidStateError` `DOMException`, and the reset.
- [X] T004 [P] Move today's run plumbing out of `src/app/core/services/sync.service.ts` into new `src/app/core/services/sync/sync-run.ts` (research R8): the `Run` type and the `AuthExpired`/`Offline`/`Superseded` error classes, exported, plus the new `interface SyncStepContext { client: SupabaseClient; userId: string; signal: AbortSignal; ensureCurrent(): void }` (data-model.md § Sync step context). `SyncService` imports them; `SyncState`, `SyncOutcome`, `SYNC_TIMEOUT_MS` stay exported from `sync.service.ts`. No behavior change.
- [X] T005 [P] Add the `DATA` block to `src/app/core/utils/entry-copy.ts` exactly as contracts/services.md § Copy / ui.md §7: `saveFailed { label: 'Dados', text: 'Não foi possível salvar a alteração neste aparelho.' }`, `deletedElsewhere { label: 'Perfil', text: 'Este perfil foi excluído em outra janela.' }`, `reload { title: 'O Grimorio foi atualizado', body: 'Uma versão mais nova foi aberta em outra janela. Recarregue esta para continuar.', action: 'Recarregar' }`, `as const`.
- [X] T006 In `src/test-setup.ts`, call `resetConnectionEventsForTests()` in the global `beforeEach`, alongside the existing DB resets.
- [X] T007 Checkpoint: run the full suite and `npm run lint` through `test-runner`, fix everything, then commit Phase 2 ("Storage & sync foundation: shared plumbing").

**Checkpoint**: Foundation ready. User story work can begin.

---

## Phase 3: User Story 1 - Know when a save failed (Priority: P1) 🎯 MVP

**Goal**: The five services save through one `WriteQueue` class; a failed save shows the "Dados" toast and later saves still run.

**Independent Test**: Force a write to fail in each of the five services; the toast appears each time, the next save lands, and `remove()` on collections/decks rejects with no toast (quickstart scenario 1).

- [X] T008 [US1] Create `src/app/core/services/save-queue.service.ts` per contracts/services.md § `save-queue.service.ts`: root `SaveQueueService.create(label, before?)` returns `new WriteQueue({ before, onError })`, where `onError` always logs `console.error(\`Grimorio: failed to persist ${label}.\`, error)` and, unless `isClosedConnectionError(error)`, calls `ToastService.show(DATA.saveFailed.label, DATA.saveFailed.text)` (FR-002, research R2).
- [X] T009 [US1] Write `src/app/core/services/save-queue.service.spec.ts`: a failing task logs and toasts once; a `DOMException('…', 'InvalidStateError')` failure logs with no toast; a successful task does neither; two failures in a row call `show` twice (the one-toast rule lives in `ToastService`, US1-4).
- [X] T010 [P] [US1] `src/app/core/services/card.service.ts`: replace `writeQueue`/`enqueueWrite` with `private readonly queue = inject(SaveQueueService).create('cards')`; every former `enqueueWrite(fn)` becomes `queue.enqueue(fn)`; `flush()` returns `queue.flush()`.
- [X] T011 [P] [US1] `src/app/core/services/collection.service.ts`: `queue = saveQueue.create('collections', () => this.cards.flush())` (keeps research R2 of spec 008, the existing comment moves with it). Every `enqueueWrite` becomes `queue.enqueue`, except `remove()`, which returns `queue.run(() => writeRows(ops, handle)).then(() => result)` so it still rejects to its dialog with no toast (FR-005). `flush()` delegates.
- [X] T012 [P] [US1] `src/app/core/services/deck.service.ts`: same as T011 with label `'decks'` and no `before`; `remove()` uses `queue.run(...)`.
- [X] T013 [P] [US1] `src/app/core/services/planar-selection.service.ts`: `queue = saveQueue.create('the planar deck selection')`; `store()` uses `queue.enqueue(() => write(target, selection))`; `flush()` delegates.
- [X] T014 [P] [US1] `src/app/core/services/planechase-game.service.ts`: `queue = saveQueue.create('the Planechase game')`; `commit()` uses `queue.enqueue(...)` with today's put/delete body; `flush()` delegates.
- [X] T015 [P] [US1] `src/app/core/services/profile-store.service.ts`: replace `writeQueue`/`enqueueWrite<T>` with `private readonly queue = new WriteQueue()` (no reporter, data-model.md owners table); every write uses `queue.run(...)`, so callers keep reporting their own errors (FR-005); `flush()` delegates.
- [X] T016 [US1] Extend the five service specs (`card.service.spec.ts`, `collection.service.spec.ts`, `deck.service.spec.ts`, `planar-selection.service.spec.ts`, `planechase-game.service.spec.ts` in `src/app/core/services/`) with a forced-failure case each (SC-001): make the store write reject (spy on the `entity-store` write or the device DB `put` the service calls), make a change, `await flush()`, assert `ToastService.show` was called once with `DATA.saveFailed`, then restore the write and assert the next change lands. In the collection and deck specs, also assert `remove()` rejects with no toast. Confirm with `grep -rn "enqueueWrite\|writeQueue" src/app` that no service keeps its own copy (SC-002).
- [X] T017 [US1] Checkpoint: run the full suite and lint through `test-runner`, fix everything, then commit Phase 3 ("Storage & sync foundation: shared save queue").

**Checkpoint**: Failed saves are visible; the MVP is shippable on its own.

---

## Phase 4: User Story 2 - Two open copies of the app stay in step (Priority: P1)

**Goal**: Connections close on takeover; a newer version mounts the reload prompt; a profile deleted elsewhere signs this copy out; saves are announced and other copies on the same profile refresh; only one copy syncs at a time.

**Independent Test**: quickstart scenarios 2, 3, 4, 6 and 8; automated: the `fake-indexeddb` takeover specs, `CrossTabService` with a fake channel pair, and each service's `refresh()`.

### Takeovers (FR-008–FR-010)

- [X] T018 [P] [US2] `src/app/core/db/profile-db.ts` (research R4): add a module-level `goneProfileIds: Set<string>` and an exported `class ProfileGoneError extends Error`. `openProfileDb(id)` rejects with `ProfileGoneError` for a gone id (never calling `openDB`), and passes idb's `blocking(currentVersion, blockedVersion)`: when `blockedVersion === null` (deleted elsewhere) close the connection, drop it from `connections`, add the id to `goneProfileIds`, `emitTakeover({ kind: 'deleted', profileId: id })`; otherwise close, keep the memo, `emitTakeover({ kind: 'upgrade' })`. `resetAllGrimorioDbsForTests` also clears `goneProfileIds`.
- [X] T019 [P] [US2] `src/app/core/db/device-db.ts`: pass `blocking` to `getDeviceDb()`'s `openDB`: close the connection, keep the memoized promise, `emitTakeover({ kind: 'upgrade' })`.
- [X] T020 [P] [US2] `src/app/core/db/entity-store.ts`: export `boundProfileId(): string | null` (contracts § entity-store), returning the profile id bound by `setActiveProfileDb`, or `null`.
- [X] T021 [US2] Extend `src/app/core/db/profile-db.spec.ts` and add device-DB cases (new `src/app/core/db/device-db.spec.ts`) against `fake-indexeddb` (research R10): a second raw `openDB` at version +1 resolves, the first connection closes and `upgrade` is emitted; `deleteDB` of a bound profile resolves (not blocked), `deleted` is emitted with its id, and a later `openProfileDb(id)` rejects with `ProfileGoneError` without recreating the database; the test reset clears the gone ids.
- [X] T022 [US2] Create `src/app/core/services/storage-health.service.ts` per contracts § storage-health: root `StorageHealthService` with `reloadRequired: Signal<boolean>` and `start()` that subscribes once to `onTakeover`. `upgrade` → `reloadRequired` set true (terminal). `deleted` whose `profileId` is the active profile (`ProfileStore`/`ProfileSessionService`) → `ToastService.show(DATA.deletedElsewhere.label, DATA.deletedElsewhere.text)`, then `void ProfileSessionService.signOut()` (ui.md §4: toast first). `deleted` for another id → ignored (data-model.md § state transitions). Add `storage-health.service.spec.ts` covering the three transitions and that `start()` twice subscribes once.
- [X] T023 [P] [US2] Create the `ReloadPrompt` component in `src/app/shared/layout/reload-prompt/` (`reload-prompt.ts`/`.html`/`.scss`/`.spec.ts`) per ui.md §2, §5, §6 and research R9: standalone, OnPush, selector `app-reload-prompt`, a `CompactModal` with `locked` always true; an `h2` (`DATA.reload.title`) the dialog is `aria-labelledby`, a subtitle (`DATA.reload.body`), and one `.btn .btn--primary` "Recarregar" with `data-autofocus` calling the injected `PAGE_RELOAD` token. Define `PAGE_RELOAD: InjectionToken<() => void>` (default `() => location.reload()`) in `reload-prompt.ts`. Follow `src/app/shared/decks/deck-delete-dialog/` for the title/subtitle/`.actions` recipe. Spec (with `stubDialog()` from `@testing/dialog`): renders the copy, Esc/✕ don't close it, the button calls the `PAGE_RELOAD` fake.
- [X] T024 [US2] Wire the shell: `src/app/app.ts` injects `StorageHealthService` and calls `start()` in its constructor; `src/app/app.html` mounts `@if (storageHealth.reloadRequired()) { <app-reload-prompt /> }` beside the other modals.

### Announcements and refresh (FR-011–FR-015)

- [X] T025 [P] [US2] Create `src/app/core/services/cross-tab.service.ts` per contracts § cross-tab and data-model.md § Change announcement: `ChangeKind` (`'cards' | 'collections' | 'decks' | 'planarSelection' | 'planechaseGame' | 'profiles'`), `CrossTabChannel`, `CROSS_TAB_CHANNEL` token (factory: `typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('grimorio-data')`), and root `CrossTabService` with a per-copy random `source` id (`crypto.randomUUID()`). `announce(kind, profileId)` posts `{ source, kind, profileId }`; `on(kind, handler)` returns an unsubscribe. Drop a message whose `source` is its own, whose `kind` is unknown, or, for the profile-scoped kinds (`cards`, `collections`, `decks`, `planarSelection`), whose `profileId !== boundProfileId()` (`planarSelection` with `null` matches only a copy with no bound profile). `planechaseGame` and `profiles` are always delivered. With a `null` channel every method is a no-op (FR-015).
- [X] T026 [P] [US2] Create `src/app/core/testing/cross-tab.ts` (research R10): `createFakeChannelPair(): [CrossTabChannel, CrossTabChannel]`, an in-memory pair where a post on one is delivered asynchronously (microtask) to the other's listeners only, plus a helper returning the `{ provide: CROSS_TAB_CHANNEL, useValue }` provider.
- [X] T027 [US2] Write `src/app/core/services/cross-tab.service.spec.ts` with the fake pair: a profile-kind message reaches the handler only when its `profileId` matches the bound profile; device kinds always arrive; a message carrying the receiver's own `source` and an unknown `kind` are dropped; with `CROSS_TAB_CHANNEL` = `null`, `announce`/`on` do nothing and don't throw.
- [X] T028 [US2] `src/app/core/services/card.service.ts`: capture `const profileId = boundProfileId()` with the handle at every enqueue, pass `onLanded: () => crossTab.announce('cards', profileId)`; add `refresh(): Promise<void>` (contracts § Entity services): await `flush()`, re-read `cards` from the current handle, set the signal only if `loadGeneration` didn't change meanwhile, never clear it first, never bump `changeCount`, never write; register `crossTab.on('cards', () => void this.refresh())` in the constructor.
- [X] T029 [US2] `src/app/core/services/collection.service.ts`: same as T028 for `'collections'`. A write whose ops put or delete `cards` rows (create-with-move, `remove()` with "Excluir as cartas", `resolveMixedCollections`) also announces `'cards'` (data-model.md). For `remove()`, announce after `queue.run` resolves.
- [X] T030 [US2] `src/app/core/services/deck.service.ts`: same as T028 for `'decks'`; any deck write that touches card rows also announces `'cards'`; `remove()` announces after `queue.run` resolves.
- [X] T031 [US2] `src/app/core/services/planar-selection.service.ts`: announce `'planarSelection'` with the profile id captured with `target` (`null` for the device selection); `refresh()` re-reads the current target's `planarSelection` meta record; register `on('planarSelection', …)`.
- [X] T032 [US2] `src/app/core/services/planechase-game.service.ts`: announce `'planechaseGame'` with `null`; `refresh()` re-reads the `planechaseGame` record from `grimorio-device`; register `on('planechaseGame', …)` (FR-012).
- [X] T033 [US2] `src/app/core/services/profile-store.service.ts`: after each `queue.run` resolves, announce `'profiles'` with `null`; `refresh()` re-reads the `profiles` store and sets the list (plan post-design re-check: the deleted profile leaves this copy's list); register `on('profiles', …)`. `refresh()` never drops the record of the profile this copy has open: if the re-read list lacks the active id, keep it until `StorageHealthService` signs out (T022), so the `deleted` takeover is the only path to the no-profile state, whichever signal arrives first.
- [X] T034 [US2] Extend the six service specs (`card`, `collection`, `deck`, `planar-selection`, `planechase-game`, `profile-store` `.service.spec.ts`) with the fake pair, one "other copy" end held by the test: a landed write posts the right kind and profile id (collection writes touching cards post both); an incoming message after a direct IndexedDB write updates the signal without clearing it first and without bumping `changeCount`; a `refresh()` racing a newer `load()` loses; a message for another profile is ignored (US2-4). Add a cross-profile case to `src/app/core/services/entity-load-isolation.spec.ts`. `applySyncResult` on cards, collections, decks and the planar selection posts its kind once the write lands (FR-014, US2-6). In `profile-store.service.spec.ts`, a `'profiles'` message that removes the active profile keeps its record in the list; in `storage-health.service.spec.ts`, the toast and `signOut()` happen exactly once whether `'profiles'` arrives before or after the `deleted` takeover.

### One sync at a time (FR-014a)

- [X] T035 [P] [US2] Create `src/app/core/services/sync/sync-lock.ts` per contracts § sync-lock: `type SyncLock = <T>(fn: () => Promise<T>) => Promise<T>` and `SYNC_LOCK: InjectionToken<SyncLock>` defaulting to `navigator.locks.request('grimorio-sync', fn)`, or `fn()` when `navigator.locks` is missing.
- [X] T036 [US2] `src/app/core/services/sync.service.ts` `run()` (research R6): set `'syncing'` before requesting the lock; inside the lock callback, first check `isCurrent(run)` (a profile switch while waiting ends as `'skipped'`), then run the existing `Promise.race([exchange, timeout])`, so the 60 s bound starts once the lock is held and the lock releases when the race settles. Extend `src/app/core/services/sync.service.spec.ts` with an in-memory serializing fake `SYNC_LOCK` provider for every test, plus a case where two `SyncService` instances (two `Injector.create` children sharing the fake lock) call `syncNow()` together: both report `'syncing'`, the second's first request starts only after the first run settles, both end `'done'`.
- [X] T037 [US2] Checkpoint: run the full suite and lint through `test-runner`; run `design-auditor` on `src/app/shared/layout/reload-prompt/` and `src/app/app.html` against ui.md and fix what it reports; then commit Phase 4 ("Storage & sync foundation: several open copies").

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Large collections sync completely (Priority: P2)

**Goal**: Sync reads every cloud row of collections, decks and cards, in pages.

**Independent Test**: `fetchAll` specs (2,500 rows, exactly 2,000, a 500-row server cap, cancel between pages) and quickstart scenario 7.

- [X] T038 [US3] Create `src/app/core/services/sync/sync-remote.ts` with `PAGE_SIZE = 1000` and `fetchAll<Row>(build, ctx: SyncStepContext): Promise<Row[]>` per research R7 and data-model.md § Paged read: each request is `build().order('id').range(from, from + PAGE_SIZE - 1).abortSignal(ctx.signal)`; throw the response `error` as today's reads do; `from` advances by the rows actually returned; stop when the rows read reach the response's `count`, or on an empty page (when `count` is null); call `ctx.ensureCurrent()` after every page (FR-016, FR-018). `build` is expected to call `select(cols, { count: 'exact' }).eq('user_id', userId)`.
- [X] T039 [US3] Write `src/app/core/services/sync/sync-remote.spec.ts` with a fake query builder recording `range` calls: 2,500 rows → 3 requests, all rows returned in order (SC-005); exactly 2,000 → 2 requests; a server capping each page at 500 still returns all 2,500; `count: null` stops on the first empty page; an `ensureCurrent` that throws `Superseded` after page 1 rejects with `Superseded` and requests no more pages; a page `error` rejects with that error.
- [X] T040 [US3] In `src/app/core/services/sync.service.ts`, replace the single reads of `collections`, `decks` and `card_entries` in `syncCollections`/`syncDecks`/`syncCards` with `fetchAll`, building a `SyncStepContext` from the `Run` (`client`, `run.profile.cloud.userId`, `run.abort.signal`, `() => this.ensureCurrent(run)`); select with `{ count: 'exact' }`. `planechase_selections` keeps its single-row read (spec assumption). The reconciler is untouched (FR-017).
- [X] T041 [US3] Extend the query mocks in `src/app/core/services/sync.service.spec.ts` with `order`, `range` and a `count` on the select response (FR-021: assertions unchanged), and add one end-to-end case: 1,500 remote cards matching local ones → no card upsert (US3-2); a remote row past 1,000 with a newer `updatedAt` wins locally (US3-3).
- [X] T042 [US3] Checkpoint: run the full suite and lint through `test-runner`, fix everything, then commit Phase 5 ("Storage & sync foundation: paged sync reads").

---

## Phase 6: User Story 4 - The device keeps the data (Priority: P2)

**Goal**: The app asks for persistent storage on profile creation and at startup, silently.

**Independent Test**: `StoragePersistenceService`'s decision table, and quickstart scenario 5.

- [X] T043 [US4] Create `src/app/core/services/storage-persistence.service.ts` per contracts § storage-persistence and research R3: root `StoragePersistenceService.request(trigger: 'startup' | 'created'): Promise<void>` that never rejects (whole body in `try/catch`). Rules in order: skip if `navigator.storage?.persist` is missing; skip if `await navigator.storage.persisted()` is `true`; for `'startup'`, skip if `ProfileStore` has no profile; otherwise `await navigator.storage.persist()` and ignore the result.
- [X] T044 [P] [US4] Write `src/app/core/services/storage-persistence.service.spec.ts` stubbing `navigator.storage` per test (restored after): no Storage API → no call, resolves; already persisted → no `persist`; `'startup'` with no profile → no `persist`; `'startup'` with a profile and not persisted → `persist` once; `'created'` → `persist` once; `persisted`/`persist` rejecting → resolves with no error (FR-007).
- [X] T045 [US4] Call sites: in `src/app/app.config.ts`'s initializer, `void inject(StoragePersistenceService).request('startup')` right after `await store.whenReady()`, never awaited (startup is not delayed); in `src/app/core/services/profile-store.service.ts` `create`, `void this.persistence.request('created')` after the record's `queue.run` resolves (covers the entry modal and `setupFromPending`). Add a `profile-store.service.spec.ts` case asserting the request follows a successful create.
- [X] T046 [US4] Checkpoint: run the full suite and lint through `test-runner`, fix everything, then commit Phase 6 ("Storage & sync foundation: persistent storage").

---

## Phase 7: User Story 5 - Change one part of sync without touching the rest (Priority: P3)

**Goal**: `SyncService` becomes a thin orchestrator over five step classes, with identical behavior.

**Independent Test**: `sync.service.spec.ts` passes with no assertion weakened (FR-021); each step file and the orchestrator stays under ~200 lines (SC-006).

- [ ] T047 [US5] Create `src/app/core/services/sync/sync-rows.ts`: move the row interfaces and the to/from mappers for cards, collections and decks out of `sync.service.ts`, unchanged.
- [ ] T048 [US5] Add `upsertRows(ctx, table, rows, onConflict)` and `deleteRows(ctx, table, ids)` to `src/app/core/services/sync/sync-remote.ts` (contracts § sync-remote): each a no-op when the list is empty, otherwise the exact query today's code runs (`abortSignal(ctx.signal)`, `eq('user_id', ctx.userId)` + `in('id', ids)` for deletes), throwing the response `error`. Add their cases to `sync-remote.spec.ts`.
- [ ] T049 [P] [US5] Create `src/app/core/services/sync/identity-sync.step.ts`: root `IdentitySyncStep.run(ctx, profileId, user)`, moving `syncIdentity`'s body unchanged.
- [ ] T050 [P] [US5] Create `src/app/core/services/sync/collections-sync.step.ts`: root `CollectionsSyncStep.run(ctx)` moving `syncCollections` (fetchAll, reconcile, `repairCollectionTree`, upload/delete, apply, clear tombstones), using `sync-rows`/`sync-remote` helpers, with `ctx.ensureCurrent()` at the same points.
- [ ] T051 [P] [US5] Create `src/app/core/services/sync/decks-sync.step.ts`: root `DecksSyncStep.run(ctx)` moving `syncDecks` (with `repairDeckNames`), same rules as T050.
- [ ] T052 [P] [US5] Create `src/app/core/services/sync/cards-sync.step.ts`: root `CardsSyncStep.run(ctx)` moving `syncCards`, same rules as T050. `resolveMixedCollections` stays in the orchestrator (research R8).
- [ ] T053 [P] [US5] Create `src/app/core/services/sync/planar-selection-sync.step.ts`: root `PlanarSelectionSyncStep.run(ctx)` moving `syncPlanarSelection` (flush, single-row read, LWW, upsert or apply) unchanged.
- [ ] T054 [US5] Reduce `src/app/core/services/sync.service.ts` to the orchestrator (research R8): same exports and public surface (`state`, `lastSyncedAt`, `start`, `profileChanged`, `syncNow`), the lock, timeout, error classification, `isCurrent`/`ensureCurrent`/`setStateIfCurrent`; `exchange` builds one `SyncStepContext` and reads as the list: account lookup → identity step → flush → collections → decks → cards → `syncedAt` + `resolveMixedCollections` → planar selection step → `lastSyncedAt` (FR-019, FR-020). Remove every moved private method and mapper.
- [ ] T055 [US5] Run `sync.service.spec.ts` through `test-runner` and fix the code, never the assertions (FR-021); then confirm with `wc -l src/app/core/services/sync.service.ts src/app/core/services/sync/*.ts` that the orchestrator and each step are ≤ ~200 lines (SC-006).
- [ ] T056 [US5] Checkpoint: run the full suite and lint through `test-runner`, fix everything, then commit Phase 7 ("Storage & sync foundation: sync split into steps").

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T057 Propose the `.claude/docs/architecture.md` update (plan: a durable convention) and apply it after the user reviews it: in the persistence paragraph, the `WriteQueue` (`core/db/write-queue.ts`, built by `SaveQueueService`, `run()` for caller-reported saves) replacing `enqueueWrite`, `refresh()` plus `CrossTabService` announcements as part of the entity-service pattern, the `blocking`/takeover handling with the reload prompt, and `SYNC_LOCK`; in the Sync bullet, the `core/services/sync/` steps and the paged reads.
- [ ] T058 Run `npm run build` and confirm it succeeds within the existing budgets (SC-008).
- [ ] T059 Run `design-auditor` on the whole feature's UI (the reload prompt, `app.html`, both toasts' copy) and fix what it reports.
- [ ] T060 Walk the manual scenarios in `specs/011-storage-sync-foundation/quickstart.md` with the user (they run the dev server and `serve:pwa`; scenario 7 only against a test account), and fix what fails.
- [ ] T061 Checkpoint: run the full suite and lint through `test-runner`, fix everything, then commit the polish phase ("Storage & sync foundation: docs and polish").

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: empty.
- **Foundational (Phase 2)**: after T000. Blocks every story.
- **US1 (Phase 3)**: after Phase 2.
- **US2 (Phase 4)**: after Phase 2, and after US1 in practice: T028–T033 add `onLanded`/announcements to the `queue` fields US1 creates in the same files.
- **US3 (Phase 5)**: after Phase 2 (needs `sync-run.ts`). Independent of US1/US2, but T036 and T040 both edit `sync.service.ts` and its spec, so run them in sequence.
- **US4 (Phase 6)**: after Phase 2. T045 edits `profile-store.service.ts` after US1/US2's changes there.
- **US5 (Phase 7)**: after US3 (moves the `fetchAll` reads into steps) and after T036 (keeps the lock in the orchestrator).
- **Polish (Phase 8)**: after every story.

### Within Each Story

- Shared modules before the services that use them (T008 before T010–T014; T018–T020 before T022; T025–T026 before T028–T034; T038 before T040).
- Specs land with their code in the same phase; the checkpoint runs the full suite.

### Parallel Opportunities

- Phase 2: T001–T005 touch different files.
- US1: T010–T015 each touch one service file.
- US2: T018, T019, T020 together; T023, T025, T026, T035 together.
- US5: T047 and T048 first (every entity step imports `sync-rows` and uses `upsertRows`/`deleteRows`), then T049–T053 together as separate new files.

---

## Parallel Example: User Story 1

```bash
# After T008 lands, move each service onto the shared queue together:
Task: "card.service.ts onto SaveQueueService (T010)"
Task: "collection.service.ts onto SaveQueueService, remove() via run (T011)"
Task: "deck.service.ts onto SaveQueueService, remove() via run (T012)"
Task: "planar-selection.service.ts onto SaveQueueService (T013)"
Task: "planechase-game.service.ts onto SaveQueueService (T014)"
Task: "profile-store.service.ts onto WriteQueue.run (T015)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T000, then Phase 2.
2. Phase 3 (US1): failed saves are visible, and SC-002 holds.
3. Stop and validate with quickstart scenario 1.

### Incremental Delivery

1. Foundation + US1 → failed saves surface.
2. + US2 → copies stay in step, takeovers handled, one sync at a time.
3. + US3 → large accounts sync completely.
4. + US4 → persistent storage requested.
5. + US5 → sync split, behavior identical.
6. Polish → docs, build, design audit, manual walkthrough.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- No backward-compatibility code for the old service shapes (spec assumptions; CLAUDE.md).
- Work on `feature/011-storage-sync-foundation` from T000; commit once per phase, in its checkpoint task, only after its checks pass.

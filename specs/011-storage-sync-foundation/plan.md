# Implementation Plan: Storage & Sync Foundation

**Branch**: `011-storage-sync-foundation` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-storage-sync-foundation/spec.md`

## Summary

This hardens the data layer before the card features build on it. No stored data changes.

**Saves**: a `WriteQueue` class replaces the five `enqueueWrite` copies, one instance per service. Failed saves log and show the PT-BR toast "Dados — Não foi possível salvar a alteração neste aparelho.", and later saves keep running. Saves whose caller already reports the error (`ProfileStore`, deleting a collection or deck) go through `run()` and are never toasted.

**Persistent storage**: `navigator.storage.persist()` runs, fire-and-forget:
- when a profile is created;
- at startup, if the device has profiles and storage isn't persistent yet.

**Several copies**:
- **Takeovers**: both IndexedDB openers handle `versionchange` (idb's `blocking`) by closing at once.
  - A newer version mounts a locked `CompactModal` reload prompt.
  - A deletion of the open profile marks the id as gone (never reopened), toasts "Este perfil foi excluído em outra janela." and signs out.
- **Announcements**: after each landed save, a `BroadcastChannel('grimorio-data')` message (kind and profile id, no data) makes other copies on that profile `refresh()` the affected service from IndexedDB.
- **Sync lock**: the Web Locks API lets only one copy sync at a time.

**Sync reads**: the reads of collections, decks and cards are paged with `order('id').range()` and `count: 'exact'`, so they read every row whatever the server's row cap.

**Sync split**: `SyncService` becomes a thin orchestrator over five step classes in `core/services/sync/`, keeping today's public surface, order and error handling.

## Technical Context

**Language/Version**: TypeScript ~6.0, Angular 22 (standalone, zoneless, signals)

**Primary Dependencies**: none new.
- **Libraries**: `idb` 8 (its `blocking` callback) and `@supabase/supabase-js` 2.116 (`order`/`range`/`count`).
- **Browser APIs**: `BroadcastChannel`, the Web Locks API (`navigator.locks`) and the Storage API (`navigator.storage.persist/persisted`).

**Storage**: IndexedDB `grimorio-device` v1 and `grimorio-profile-{id}` v3, both unchanged. The Supabase tables are unchanged, with no migration.

**Testing**:
- Vitest via `ng test` (jsdom, `fake-indexeddb`).
- Every new browser API sits behind an injection token (`CROSS_TAB_CHANNEL`, `SYNC_LOCK`, `PAGE_RELOAD`) or is stubbed per spec (`navigator.storage`).
- Two copies are simulated with a fake channel pair (research R10).

**Target Platform**: browser/PWA (Chromium, Firefox, Safari) and the Capacitor Android WebView (Chromium)

**Project Type**: single-project Angular web app

**Performance Goals**:
- A change in one copy appears in another within 2 s (SC-003).
- A newer version opens within 2 s with an older copy open (SC-004).
- Paging adds no request for accounts under 1,000 rows per table.

**Constraints**:
- Fully offline.
- Profile isolation is unchanged: announcements are filtered by bound profile, and deleted profiles are never reopened.
- Startup is never delayed by the persist request.
- Sync's observable behavior is identical (FR-020), and the reconciler is untouched (FR-017).

**Scale/Scope**:
- **New**: 2 `core/db` modules, 4 root services, 9 files under `core/services/sync/`, 1 shell component, 1 copy block and 1 test helper.
- **Changed**: 6 persistence services (`CardService`, `CollectionService`, `DeckService`, `PlanarSelectionService`, `PlanechaseGameService`, `ProfileStore`), `profile-db`, `device-db`, `entity-store`, `SyncService`, `app.config`, `app.ts`/`app.html` and `test-setup`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Physical-World Fidelity | Pass | Strengthens it. A failed location save is no longer silent (FR-002). Two copies no longer overwrite each other's card moves from stale memory (FR-011). Sync no longer re-uploads stale rows past 1,000 (FR-016). |
| II. PT-BR-First | Pass | All new copy is PT-BR in `entry-copy.ts` (`DATA`, ui.md §7), with "aparelho" for device. No raw error text reaches the UI: saves show a fixed toast, and sync keeps its existing classification. |
| III. Free and Accessible | Pass | No limits. The persist request is free and has no UI of its own. |
| IV. Local-First, Cloud-Optional | Pass | Everything except paging is local-only. Announcements are filtered by bound profile (FR-013), deleted profiles are never recreated (FR-010), and the game and planar selection keep their device/profile scopes. |
| V. Zoneless, Signal-Driven Angular | Pass | `ReloadPrompt` is standalone and OnPush, on native `<dialog>` through `CompactModal`. The state is signals (`reloadRequired`), and `refresh()` sets signals with no zone patching. DESIGN.md already covers the compact modal (ui.md §5), so there's no undecided visual. |
| VI. Persistence and Sync Pattern | Pass | The serialized write queue stays per service, now one shared class (the principle's "serialized write queue", centralized). `load`/`whenReady`/`flush`, `updatedAt`, tombstones and `reconcileEntities` are unchanged. `refresh()` joins the pattern for future entity services. No new Supabase table. |

**Post-design re-check (after Phase 1)**: still passes. Two deliberate choices are recorded rather than silent:

- Closed-connection save failures aren't toasted (research R2), because the takeover message covers them.
- `ProfileStore` also announces and refreshes (`profiles` kind). That is beyond FR-011's list, but needed so a profile deleted in another copy leaves this copy's list and can't be reopened (FR-010).

The `architecture.md` persistence paragraph will need the `WriteQueue`, `refresh()` and announcement convention after implementation (CLAUDE.md "worth adding": a durable convention).

## Project Structure

### Documentation (this feature)

```text
specs/011-storage-sync-foundation/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── services.md      # Phase 1
├── ui.md                # Phase 1
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### UI Design (Phase 1 → `ui.md`)

[ui.md](ui.md) covers the locked reload prompt (a `CompactModal` with one "Recarregar" button) and the two new toasts. No existing screen changes.

### Source Code (repository root)

```text
src/app/
├── app.config.ts                        # changed: void persistence.request('startup') after store.whenReady()
├── app.ts / app.html                    # changed: StorageHealthService.start(); @if reloadRequired → <app-reload-prompt />
├── core/
│   ├── db/
│   │   ├── write-queue.ts               # new: WriteQueue (R1)
│   │   ├── write-queue.spec.ts
│   │   ├── connection-events.ts         # new: takeover events, isClosedConnectionError, gone ids (R2, R4)
│   │   ├── connection-events.spec.ts
│   │   ├── profile-db.ts                # changed: blocking handler, gone ids, ProfileGoneError
│   │   ├── device-db.ts                 # changed: blocking handler
│   │   └── entity-store.ts              # changed: boundProfileId()
│   ├── services/
│   │   ├── save-queue.service.ts        # new: queues with the toast reporter (R1, R2)
│   │   ├── cross-tab.service.ts         # new: BroadcastChannel announcements (R5)
│   │   ├── storage-health.service.ts    # new: reloadRequired, deleted-elsewhere handling (R4)
│   │   ├── storage-persistence.service.ts # new (R3)
│   │   ├── card / collection / deck / planar-selection / planechase-game .service.ts  # changed: WriteQueue, announce, refresh()
│   │   ├── profile-store.service.ts     # changed: WriteQueue.run, announce 'profiles', refresh(), persist on create
│   │   ├── sync.service.ts              # changed: orchestrator only, + SYNC_LOCK
│   │   └── sync/                        # new (R8)
│   │       ├── sync-run.ts
│   │       ├── sync-rows.ts
│   │       ├── sync-remote.ts           # fetchAll / upsertRows / deleteRows (R7)
│   │       ├── sync-remote.spec.ts
│   │       ├── sync-lock.ts
│   │       ├── identity-sync.step.ts
│   │       ├── collections-sync.step.ts
│   │       ├── decks-sync.step.ts
│   │       ├── cards-sync.step.ts
│   │       └── planar-selection-sync.step.ts
│   ├── testing/
│   │   └── cross-tab.ts                 # new: fake channel pair (R10)
│   └── utils/
│       └── entry-copy.ts                # changed: DATA block
├── shared/layout/reload-prompt/         # new: ReloadPrompt (.ts/.html/.scss/.spec.ts) (R9)
└── test-setup.ts                        # changed: resetConnectionEventsForTests()
```

**Structure Decision**: the existing single Angular project.
- **Queue and takeover plumbing** go in `core/db`, next to the IndexedDB code they serve, free of Angular.
- **Angular-aware pieces** are root services in `core/services`.
- **Sync steps** get a `sync/` subfolder, so the orchestrator keeps its import path for `SyncStatusService`, `App` and the specs.
- **The reload prompt** is shell-level, so it lives in `shared/layout/`.

## Complexity Tracking

No constitution violations to justify.

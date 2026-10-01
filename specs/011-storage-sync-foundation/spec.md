# Feature Specification: Storage & Sync Foundation

**Feature Branch**: `011-storage-sync-foundation`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Storage & sync foundation — a safe, shared data layer (backlog items #18, #27, #29, #30, #17). (1) One shared write queue used by CardService, CollectionService, DeckService, PlanarSelectionService and PlanechaseGameService, replacing each service's own enqueueWrite copy; a failed local save is surfaced to the user as a PT-BR toast via ToastService instead of only console.error. (2) Request persistent storage (navigator.storage.persist()) once, after the first profile is created, so the browser/Android WebView is less likely to evict IndexedDB data. (3) Multi-tab correctness: profile and device database connections close on versionchange/blocking so a newer tab's upgrade never stalls, and tabs open on the same profile announce writes over BroadcastChannel so other tabs rehydrate the affected data (e.g. installed PWA + browser tab stay consistent). (4) Sync pulls page the full remote list with .range() for collections, decks, card entries and the planar selection, so accounts past the Data API's 1,000-row cap sync correctly; the reconciler is unchanged (no incremental pull). (5) SyncService (~620 lines) is split into one sync step per entity (identity, collections, decks, cards, planar selection, with their repair passes) behind a thin orchestrator, with identical behavior and step order. Out of scope: cross-device delete propagation (#39)."

## Context

Every Grimorio feature saves through the same data layer: the profile's data stays on the device, and an optional cloud account syncs it. That layer has quiet failure modes today:

- A save that fails is only logged to the console. The screen keeps showing the change, and it is gone after a reload, with no warning to the person.
- The browser may evict the device's data under storage pressure, because the app never asks for its storage to be kept.
- With the app open twice on one device (the installed app plus a browser tab, say), each copy keeps its own picture of the data, and neither sees the other's edits. An app update that changes the stored data's structure can also stall until the older copy is closed.
- Sync reads at most 1,000 rows per table from the cloud. Past that, the unseen rows are treated as never uploaded and re-sent on every sync, and a newer cloud edit of one of them can be overwritten by the older local copy.
- The sync code is one large unit covering every kind of data, which makes it costly to change safely.

This spec fixes these before the card features and later entities build on top. It is entry 2 on the feature roadmap (`backlog/features.md`, "Storage & sync foundation") and absorbs pending items #18, #27, #29, #30 and #17. Its decisions were settled while planning it: failed saves are shown as a toast; copies of the app open at the same time resync with each other; sync reads the whole cloud list in pages rather than only what changed.

## Clarifications

### Session 2026-10-01

- Q: When an older open copy must stop using its data because a newer version took over, how should it tell the person to reload? → A: A locked `CompactModal` (Esc, backdrop and ✕ don't close it) with a short message and one "Recarregar" button.
- Q: If a sync starts in two open copies at once, do both run or does one wait? → A: One at a time across copies; the second shows the syncing state and runs after the first finishes.
- Q: When another copy deletes the profile this copy has open, what does this copy show? → A: A PT-BR toast ("Este perfil foi excluído em outra janela."), then the usual no-profile behavior (the entry modal opens on gated routes).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Know when a save failed (Priority: P1)

A person moves a stack of cards into a new collection. The device's storage refuses the write (it is full, or the browser blocked it). Instead of the change silently disappearing on the next reload, a toast says in Portuguese that the change could not be saved on this device.

**Why this priority**: Losing data without a warning is the most harmful failure in a collection tracker (Constitution I: the app must always know where each card is). This is the smallest change that makes the failure visible.

**Independent Test**: Force a local write to fail (for example, by making the device database reject it), make a change in each kind of data (a card move, a collection, a deck, the planar deck selection, a Planechase game action), and confirm a toast appears each time and later saves still go through.

**Acceptance Scenarios**:

1. **Given** a profile is open, **When** saving a change to collections, decks or cards fails, **Then** a PT-BR toast tells the person the change was not saved on this device.
2. **Given** the planar deck selection or a Planechase game in progress, **When** saving it fails, **Then** the same toast appears.
3. **Given** one save has failed, **When** the person makes another change, **Then** that change is still attempted and saved if storage allows it; one failure does not block later saves.
4. **Given** several saves fail in quick succession, **When** the toasts would pile up, **Then** the person sees one toast at a time, never a stack (the app's one-toast rule).
5. **Given** a save succeeds, **When** it lands, **Then** no toast is shown; successful saves stay silent as today.

---

### User Story 2 - Two open copies of the app stay in step (Priority: P1)

A person has the installed Grimorio open, and also a browser tab with it on the same profile. They create a deck in the tab. When they switch to the installed app, the deck is there without a reload. Later an app update changes how data is stored; opening the new version updates the data even though an older copy is still open.

**Why this priority**: Two copies holding different pictures of the same data is the setup in which one copy's next save overwrites the other's edits. The app is meant to be installed (PWA) while a browser tab is also easy to have open, so this setup is common.

**Independent Test**: Open the app in two tabs on the same profile; create, rename and delete a collection, a deck and a card move in one, and confirm the other shows each change within a couple of seconds. Then open a build that raises the stored-data version while an old tab is open, and confirm the new tab loads and the old one stops using the database.

**Acceptance Scenarios**:

1. **Given** two copies of the app open on the same profile, **When** collections, decks or cards change in one, **Then** the other shows the change without a reload.
2. **Given** two copies of the app open on the same profile, **When** the planar deck selection changes in one, **Then** the other shows the new selection.
3. **Given** two copies of the app open, on any profile or none, **When** the Planechase game in progress changes in one, **Then** the other shows the same game state (the game belongs to the device, not to a profile).
4. **Given** two copies of the app open on *different* profiles, **When** one changes its profile's data, **Then** the other copy's data is untouched.
5. **Given** an older copy of the app is open, **When** a newer version that changes the stored-data structure is opened, **Then** the newer copy opens its data without waiting, and the older copy stops using the database and asks the person to reload.
6. **Given** a sync runs in one copy, **When** it brings in changes from the cloud, **Then** the other copy shows them too.

---

### User Story 3 - Large collections sync completely (Priority: P2)

A person with 2,500 cards syncs their profile with their cloud account. Every card, collection and deck is compared with its cloud copy, so nothing is re-uploaded needlessly on each sync, and a newer edit made on another device is kept.

**Why this priority**: Today's accounts are well below the 1,000-row limit, so nobody is affected yet, but the first person past it would lose edits silently. Cheap to fix now, while sync is being restructured anyway.

**Independent Test**: With a test cloud account (or a simulated cloud) holding more than 1,000 rows in a table, sync and confirm every row is read, no unchanged row is uploaded, and a row edited remotely past row 1,000 keeps the remote edit.

**Acceptance Scenarios**:

1. **Given** a cloud account with more than 1,000 cards, **When** the profile syncs, **Then** every cloud card is compared with the local data, not only the first 1,000.
2. **Given** a synced profile with more than 1,000 cards and no changes since, **When** it syncs again, **Then** no card is uploaded.
3. **Given** a card beyond the first 1,000 was edited on another device more recently than here, **When** this device syncs, **Then** the newer edit wins, as it would for any other card.
4. **Given** collections or decks past 1,000 rows, **When** the profile syncs, **Then** they behave the same way.

---

### User Story 4 - The device keeps the data (Priority: P2)

A person on an Android phone that is running low on space keeps using Grimorio without a cloud account. The phone clears other sites' storage, but Grimorio's profiles and collections are kept, because the app asked the browser to treat its storage as persistent.

**Why this priority**: For a person without a cloud account, eviction loses their whole collection. The request is one call with no UI, but the browser decides whether to grant it, so it reduces the risk rather than removing it.

**Independent Test**: On a fresh device, create the first profile and confirm the app asks for persistent storage; reload with a profile present and confirm it asks again only if not already granted; confirm the app works the same if the request is denied or not supported.

**Acceptance Scenarios**:

1. **Given** a device with no profiles, **When** the first profile is created, **Then** the app asks the browser to keep its storage persistently.
2. **Given** a device that already has profiles but no persistent storage yet, **When** the app starts, **Then** it asks again.
3. **Given** the browser denies the request, ignores it or doesn't support it, **When** the app continues, **Then** nothing visible changes and no error is shown.
4. **Given** storage is already persistent, **When** the app starts, **Then** it does not ask again.

---

### User Story 5 - Change one part of sync without touching the rest (Priority: P3)

The maintainer needs to change how decks sync. They find the deck sync as its own small step, change it, and the rest of sync (identity, collections, cards, planar selection) is untouched, with the existing sync tests still passing.

**Why this priority**: No direct user value, but the card features and future entities each add or change a sync step; a single large sync unit makes each of those risky.

**Independent Test**: Run the existing sync test suite after the split and confirm it passes unchanged in what it asserts; check that each kind of data syncs through its own step and that the steps run in the same order as before.

**Acceptance Scenarios**:

1. **Given** the split sync, **When** a profile syncs, **Then** identity, collections, decks, cards and the planar deck selection sync in that order, with the same results as before the split.
2. **Given** the split sync, **When** a step fails or the sync is cancelled (a profile switch, sign-out), **Then** sync stops and reports its state exactly as before.
3. **Given** the split sync, **When** the maintainer reads one step, **Then** it contains only that kind of data's pull, reconciliation, repair pass and upload.

### Edge Cases

- **A failed save that was already shown on screen**: the screen keeps showing the change after the toast (saves are optimistic today); the toast tells the person it won't survive a reload. Rolling the screen back is out of scope.
- **The same failure repeating on every save** (storage full): each failure replaces the previous toast, so the person sees one toast that keeps reappearing, never a stack.
- **A save fails while a modal is open**: the toast shows inside the top modal, per the existing toast rule.
- **The profile switches while a save is still pending**: the save still goes to the profile it was made for (each service already captures the target database when the save is queued), and a failure still shows the toast.
- **Another copy deletes the open profile**: deleting a profile's database asks the other copies to close it; the other copy stops using the deleted profile's data instead of recreating an empty database on its next save, shows a toast saying the profile was deleted in another window, and returns to the no-profile state (FR-010).
- **Another copy switches or signs out of its profile**: each copy keeps the profile it has open; only data changes are shared between copies, not which profile is active.
- **A change arrives from another copy while a dialog is open on the affected item** (renaming a collection the other copy just deleted, say): the data refreshes underneath, and the dialog's action behaves as it would after a local deletion of the same item.
- **A copy receives a change for a profile it doesn't have open**: it ignores it.
- **The two copies save at the same moment**: each save lands, and the copies converge on the last one written; no merge of the same record is attempted.
- **Two copies start a sync at the same time**: the second waits, showing the syncing state, and runs after the first ends, so two syncs never overlap and write back each other's stale data (FR-014a).
- **The browser doesn't support cross-copy messaging**: each copy still works on its own, as today.
- **A cloud table has exactly a multiple of the page size**: reading stops once the rows read match the cloud's total count, so no row is read twice or missed and no extra empty page is requested.
- **A sync is cancelled between pages**: it stops as cancellation does today; nothing is uploaded based on a partial read.
- **The cloud's page limit is configured lower than expected**: each page advances by the rows it actually returned, and reading continues until the total count is reached, so a lower server limit only adds requests and never drops rows.

## Requirements *(mandatory)*

### Functional Requirements

**Shared save queue and failed saves (#18)**

- **FR-001**: Cards, collections, decks, the planar deck selection and the Planechase game MUST save through one shared queueing mechanism instead of five copies. Each service keeps its own queue instance, so saves of one kind of data still run in order and don't wait on another kind's saves, except where they do today (collection saves wait for pending card saves).
- **FR-002**: When a queued save fails, the app MUST show a PT-BR toast saying the change was not saved on this device, and MUST still log the failure for the maintainer.
- **FR-003**: A failed save MUST NOT stop later saves in the same queue from running.
- **FR-004**: Waiting for all pending saves (used before sync and in tests) MUST keep its current behavior: it resolves once every queued save has finished, successful or not.
- **FR-005**: Saves whose caller already waits for the result and reports its own error (the profile registry, and deleting a collection or a deck, whose dialogs already show an error) MUST keep reporting through their caller, without an extra toast for the same failure.

**Persistent storage (#27)**

- **FR-006**: The app MUST ask the browser to keep its storage persistently when a profile is created, and at startup whenever the device has at least one profile and storage isn't already persistent.
- **FR-007**: A denied, ignored or unsupported request MUST have no visible effect from the app and MUST NOT block or delay startup or profile creation.

**Several open copies (#29)**

- **FR-008**: When another copy of the app needs to upgrade or delete a database this copy has open, this copy MUST close its connection right away so the other copy is never left waiting.
- **FR-009**: After closing its connection because of a newer version, a copy MUST stop using the database and ask the person to reload, instead of saving into a database structure it doesn't know. The prompt is a locked `CompactModal` (Esc, the backdrop and ✕ don't close it) with a short PT-BR message and a single "Recarregar" action that reloads the page.
- **FR-010**: After closing its connection because its open profile's database was deleted, a copy MUST NOT recreate that database, MUST show a PT-BR toast saying the profile was deleted in another window (along the lines of "Este perfil foi excluído em outra janela."), and MUST return to the no-profile state, where gated routes open the entry modal as usual.
- **FR-011**: When a copy saves a change to a profile's collections, decks, cards or planar deck selection, every other copy open on the same profile MUST reload that kind of data from the device and show the change, without a reload of the page.
- **FR-012**: When a copy saves a change to the Planechase game in progress, every other copy MUST reload the game and show it, whatever profile each copy has open.
- **FR-013**: A copy MUST NOT reload data because of its own saves, and MUST ignore announcements about a profile it doesn't have open.
- **FR-014**: Changes brought in by a sync in one copy MUST reach the other copies the same way as local edits.
- **FR-014a**: Only one copy of the app on the device MUST sync at a time. A sync started while another copy is syncing MUST show the syncing state and run once the other copy's sync ends (finished, failed or cancelled).
- **FR-015**: If the browser offers no way for copies to message each other, each copy MUST keep working on its own as it does today.

**Complete sync reads (#30)**

- **FR-016**: Sync MUST read the full cloud list of collections, decks and cards for the account, in pages, until the rows read reach the cloud's total row count (or, when no count comes back, until a page comes back empty), and only then reconcile.
- **FR-017**: How local and cloud rows are reconciled MUST NOT change: same last-write-wins rule, same handling of deletions made on this device.
- **FR-018**: A sync cancelled while reading pages MUST stop without uploading or changing anything based on the partial read.

**Sync split into steps (#17)**

- **FR-019**: Sync MUST be organized as one step per kind of data (identity, collections, decks, cards, planar deck selection), each holding that kind's pull, reconciliation, repair pass and upload, run in today's order by a small coordinating part.
- **FR-020**: The split MUST NOT change sync's observable behavior: the same order, the same results, the same status and error reporting, the same cancellation, and the same repair passes (repairing the collection tree, de-duplicating deck names, moving cards out of collections that also hold subcollections).
- **FR-021**: The existing sync tests MUST pass after the split without weakening what they assert; tests MAY move to follow the code they cover.

**Unchanged behavior**

- **FR-022**: Apart from the toasts (FR-002, FR-010), the reload prompt (FR-009), data now appearing across copies (FR-011–FR-014) and syncs waiting on another copy's sync (FR-014a), the app MUST behave as before: same screens, flows, stored data and sync results.

### Key Entities

- **Save queue**: an ordered list of pending saves for one kind of data; it runs them one at a time, reports any failure, and lets callers wait until it is empty.
- **Change announcement**: a short message one copy of the app sends to the others after saving: which profile (or the device, for the Planechase game) and which kind of data changed. It carries no data itself; receivers reload from the device.
- **Sync step**: the sync of one kind of data (identity, collections, decks, cards, planar deck selection): read the cloud list in full, reconcile, repair, upload. The coordinator runs the steps in order and owns status and cancellation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 5 out of 5 kinds of data (cards, collections, decks, planar deck selection, Planechase game) show the save-failure toast when their save is forced to fail.
- **SC-002**: The saving logic exists once: 0 of the five services keep their own copy of it.
- **SC-003**: With two copies open on the same profile, a change in one appears in the other within 2 seconds, for each of collections, decks, cards, the planar deck selection and the Planechase game.
- **SC-004**: With an older copy open, a newer version that raises the stored-data version opens its data within 2 seconds, with no manual closing of the older copy.
- **SC-005**: A sync of an account with 2,500 rows in a table reads all 2,500, and a second sync with no changes in between uploads 0 rows.
- **SC-006**: The existing sync test suite passes after the split, and no single sync step or the coordinator is longer than about a third of today's sync unit (~620 lines).
- **SC-007**: On a fresh device, creating the first profile asks for persistent storage, and the app behaves identically whether the request is granted or denied.
- **SC-008**: The production build, lint and the full test suite pass with zero errors.

## Assumptions

- **Toast copy**: label "Dados" (or the area's existing label), text along the lines of "Não foi possível salvar a alteração neste aparelho." The exact copy is settled in planning, with "aparelho" as the app's existing word for device.
- **Profile registry**: `ProfileStore` already returns save failures to its callers, which report them in the entry and profile modals, so it is not moved onto the shared queue's toast path (FR-005). It may reuse the queueing part where that fits.
- **Persistent storage on existing devices**: the request also runs at startup (FR-006) because devices that already have profiles, including the maintainer's, would otherwise never reach the "first profile created" moment.
- **Copies on one device only**: "copies of the app" means tabs or windows of the same browser profile on one device, including the installed PWA. Other devices stay the job of cloud sync.
- **The reload prompt** after a version change (FR-009) reuses the existing locked `CompactModal` pattern, so it needs no new DESIGN.md entry.
- **Page size**: the cloud's default response limit (1,000 rows); FR-016's total-count rule keeps it correct if the server limit differs.
- **The planar deck selection** is a single row per account, so paging doesn't apply to it; it is synced as today.
- **Out of scope**: propagating deletions across devices (#39, a row deleted on one device is re-uploaded by another); reading only what changed since the last sync; rolling the screen back after a failed save; syncing which profile is active across copies.
- Per the project's early-development policy, no compatibility code is kept for the old service shapes.

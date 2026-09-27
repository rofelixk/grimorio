# Contract: Services, utils and components

Signatures are TypeScript. "Failure" is `cloud-error.util`'s PT-BR `Failure`. Every method that talks
to the cloud throws only `Failure`s (spec 003 R8).

## Core services

### `ProfileStore` (changed)

```ts
rename(id: string, name: string): Promise<void>                 // trims; stamps nameUpdatedAt
setColors(id: string, colors: Color[], at?: string): Promise<void> // stamps colorsUpdatedAt = at ?? now
remove(id: string): Promise<void>                               // drops the registry record
isNameTaken(name: string, exceptId?: string): boolean           // unchanged; rename passes exceptId
// create() now also sets nameUpdatedAt and colorsUpdatedAt to the creation time
```

### `ProfileLifecycleService` (new, `core/services/profile-lifecycle.service.ts`)

```ts
/** Verify → sign out → cloud cleanup (no network needed) → deleteProfileDb → remove (R9).
 *  Throws { kind: 'field', field: 'pw', message: MSG.wrongLocal } on a wrong password.
 *  Resolves with the number of profiles left on the device. */
deleteProfile(id: string, password: string): Promise<number>
```

### `profile-db.ts` (changed)

```ts
deleteProfileDb(profileId: string): Promise<void> // closes the memoized connection, then deleteDB
```

### `CloudAuthService` (changed)

```ts
checkAccount(profileId: string): Promise<'ok' | 'gone' | 'expired' | 'offline'>
/** Local only: removeSession + setCloud(null) + toast; bumps accountGone. */
forgetGoneAccount(profileId: string): Promise<void>
readonly accountGone: Signal<{ profileId: string; n: number } | null>
changeAccountPassword(profileId: string, current: string, next: string): Promise<void>
deleteAccount(profileId: string, password: string): Promise<void>
/** Online: checkAccount first; 'gone' → forgetGoneAccount and resolves 'gone'. */
unlink(profileId: string): Promise<'unlinked' | 'gone'>
// linkPending / signUp additionally write grm_label_at / grm_colors_at, and linkPending passes
// grm_colors_at to setColors when it adopts the account's colors.
```

### `SyncService` (changed)

```ts
type SyncOutcome = 'done' | 'offline' | 'reauth' | 'error' | 'skipped' | 'gone';
// exchange(): checkAccount → identity step (reconcileIdentity + updateUser/setColors) → locations → cards
```

### `SyncStatusService` (changed)

`act()`: `link` → `profileModal.open({ start: 'in' })`; `reauth` → `profileModal.open({ start: 'reauth' })`.

### `ProfileModalService` (new, `core/services/profile-modal.service.ts`)

```ts
export type ProfileStart = 'hub' | 'in' | 'up' | 'reauth';
export interface ResolvedProfileRequest { id: number; start: ProfileStart }
readonly request: Signal<ResolvedProfileRequest | null>
readonly isOpen: Signal<boolean>
open(request?: { start?: ProfileStart }): void // no-op with no active profile or while the entry modal is open
close(): void
```

### `EntryModalService` (changed)

`EntryStart` loses `unlink` and `reauth`, and `EntryContext` loses `link`. `open()` is a no-op while
the profile modal is open.

### `ToastService` (new, `core/services/toast.service.ts`)

```ts
export const TOAST_MS = 5_000;
readonly toast: Signal<{ id: number; label: string; text: string } | null>
readonly topHost: Signal<number>
show(label: string, text: string): void // replaces the current toast, restarts the timer
dismiss(): void
pushHost(): number                      // returns a host id; the newest is on top
popHost(id: number): void
```

## Pure utils

### `core/utils/identity-sync.util.ts` (new)

```ts
reconcileIdentity(local: LocalIdentity, remote: RemoteIdentity): IdentityResult // data-model §2
```

### `core/utils/sync-status.util.ts` (changed)

```ts
hasUnsyncedChanges(input: {
  linked: boolean; lastSyncedAt: string | null;
  cards: { updatedAt: string }[]; locations: { updatedAt: string }[];
  tombstoneCount: number; colorsUpdatedAt: string; nameUpdatedAt: string;
}): boolean
```

### `core/utils/entry-flow.util.ts` (changed)

- `validateName(name: string, isTaken: (n: string) => boolean): string | null` is extracted, and
  `validate()` uses it.
- The `link` context and the `reauth`/`unlink` phases and done kinds are removed.
- `recover-form` gets the new copy and a button row (FR-024).

### `core/utils/profile-flow.util.ts` (new)

The pure rules for `ProfilePhase`: `titleFor`, `subtitleFor`, `captionFor`, `primaryLabel`/`busyLabel`,
`promptFor`, `doneCopy`, `validateStep(phase, fields, deps)` (pw/pwNew/pwConfirm order per research R7),
`linkState(profile)`, and `hubCloudMeta`. For the shared cloud phases, the labels and
`fieldsFor`/`validate` delegate to `entry-flow.util`.

### `core/utils/entry-copy.ts` (changed)

New sections `PROFILE` (titles, subtitles, captions, rows, plates, done copy, sync plate, empty
device) and `TOAST`. New `MSG.pwMismatch`, `MSG.samePassword`, `MSG.goneHint`. `SHELL.profileHint`
and `profileLabel` are updated (R16). The `reauth`/`unlink` entries move from the entry-modal sections
to `PROFILE`. See [../ui.md](../ui.md) §7 for every string.

## Components

| Component | Path | Contract |
|---|---|---|
| `ProfileModal` | `shared/auth/profile-modal/` | Rendered once in `app.html`. Provides `ProfileFlowStore` and `{ provide: CloudFlowHost, useExisting: ProfileFlowStore }` |
| `ProfileFlowStore` | `shared/auth/profile-modal/profile-flow.store.ts` | data-model §6 |
| `ProfileHub`, `LocalScreen`, `CloudScreen`, `PasswordStep`, `DeleteProfileStep`, `DeleteCloudStep`, `ProfileDonePanel` | `shared/auth/profile-modal/*/` | Inject `ProfileFlowStore`. `in`/`up`/`reauth` reuse `CloudForm`, and the reset reuses `ResetForm` |
| `CloudFlowHost` | `shared/auth/cloud-flow-host.ts` | The abstract class read by `CloudForm`/`ResetForm` (research R2) |
| `IdentityWheel` | `shared/ds/identity-wheel/` | The API is unchanged. The internals are v2 (research R14) |
| `ActionRow` | `shared/ds/action-row/` (new) | `title`, `meta`, `verb` (micro label), `danger?`, `disabled?`, a leading content slot; emits `activate`. A `<button>`, 56px minimum |
| `SyncPlate` | `shared/ds/sync-plate/` (new) | Reads `SyncStatusService` and the active profile. Emits `link`/`reauth`, and calls `act()` for sync/retry |
| `ToastOutlet` | `shared/ds/toast/` (new) | `popover="manual"`. Renders only while it is the top host (research R13) |
| `ThemedModal` | changed | Hosts a `ToastOutlet` (push on open, pop on close) |
| `NavDrawer` | changed | Hosts a `ToastOutlet`. `onProfile` and `onSyncAction` route to the profile modal (R16) |
| `TopBar` | changed | `openProfile()` routes to the profile modal when a profile is active |
| `Home` | changed | The empty-device state when `profiles().length === 0` |
| `App` | changed | Renders `<app-profile-modal />` and the base `ToastOutlet` |
| `fluid-face.ts` | `shared/ds/themed-modal/` (new) | The fluid height and first-field focus, shared by both modals (research R19) |

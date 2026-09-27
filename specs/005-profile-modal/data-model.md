# Data Model: Profile Modal

**Feature**: `005-profile-modal` | **Date**: 2026-09-27

There are no new IndexedDB stores, and the `grimorio-device` version is unchanged. There are no new
Supabase tables. The changes:
- two new fields on `ProfileRecord`
- two new keys on the account's `user_metadata`
- one Postgres function
- the profile modal's in-memory state machine

## 1. `ProfileRecord` (`grimorio-device` → `profiles`)

| Field | Change | Rule |
|---|---|---|
| `name` | now mutable | 3–16 characters, `^[A-Za-z0-9_.-]+$`, trimmed. Unique among the *other* profiles, compared case-insensitively (FR-009) |
| `nameUpdatedAt` | **new**, `string` (ISO) | Set at `create`, restamped by `rename`. Decides whether a sync writes `grm_label` (research R6) |
| `colors` | now mutable | 1–3 distinct values of W U B R G, in pick order (FR-008) |
| `colorsUpdatedAt` | **new**, `string` (ISO) | Set at `create`, restamped by `setColors`. On adopting account colors, takes `grm_colors_at` instead (R6) |
| `password` | now mutable | A new PBKDF2 hash on `setPassword` (FR-010) |
| `cloud` | unchanged shape | Set to `null` by unlink, by cloud account deletion, and by a gone account (FR-019b) |

**Deletion**: `ProfileStore.remove(id)` drops the record. `grimorio-profile-{id}` is deleted with
`deleteDB` (R9), and `grm-cloud:{id}*` localStorage keys are cleared with `removeSession`. If the
deleted profile was active, `activeProfileId` is `null` afterwards.

`ProfileSummary` (`Omit<ProfileRecord, 'password'>`) carries both new fields.

## 2. Account `user_metadata` (Supabase Auth)

| Key | Type | Written | Read |
|---|---|---|---|
| `grm_label` | `string` | on link and sign-up, and by a sync when local `nameUpdatedAt` is newer than `grm_label_at` | new-device setup pre-fill (unchanged) |
| `grm_label_at` | ISO `string` | **new**, together with `grm_label` | the sync identity step |
| `grm_colors` | `Color[]` 1–3 | on sign-up, on link when absent, and by a sync when local colors are newer | on link, on setup, and by a sync when the remote is newer (adopted silently) |
| `grm_colors_at` | ISO `string` | **new**, together with `grm_colors` | the sync identity step. When absent, it counts as older than any local change |

### Identity reconciliation (`reconcileIdentity`, pure)

Input: `{ colors, colorsUpdatedAt, name, nameUpdatedAt }` (local) and
`{ colors?, colorsAt?, labelAt? }` (remote). Output: `{ adoptColors: {colors, at} | null, write: Partial<metadata> | null }`.

| Condition | Result |
|---|---|
| remote colors present, and `colorsAt > colorsUpdatedAt` | `adoptColors = {remote colors, colorsAt}` |
| remote colors absent, or `colorsUpdatedAt > colorsAt` (with different colors) | `write.grm_colors` + `grm_colors_at = colorsUpdatedAt` |
| equal colors | nothing, whatever the timestamps say |
| `labelAt` absent, or `nameUpdatedAt > labelAt` | `write.grm_label = name`, `grm_label_at = nameUpdatedAt` |
| otherwise | the label is untouched. The remote label is **never** adopted as the local name |

## 3. Supabase function

`public.delete_own_account()`: `SECURITY DEFINER` and `search_path = ''`. It deletes
`auth.users` where `id = auth.uid()`, and the foreign keys cascade to `card_entries` and
`storage_locations`. `EXECUTE` is granted to `authenticated` only. See
[contracts/supabase.md](contracts/supabase.md).

## 4. Sync (`SyncService`)

- `SyncOutcome` gains `'gone'`. The identity step runs first and calls `checkAccount` (R12):
  - `gone` → `forgetGoneAccount`, state `idle`, returns `'gone'`
  - `expired` → `markNeedsReauth`, state `reauth`
  - `ok` → reconcile the identity, then locations, then cards
- `SyncState` is unchanged.

### Unsynced changes (`hasUnsyncedChanges`, pure)

This is true for a linked profile when any of these holds:
- a card or location tombstone exists
- a card or location has `updatedAt > lastSyncedAt` (any row counts when `lastSyncedAt` is null)
- `colorsUpdatedAt > lastSyncedAt`
- `nameUpdatedAt > lastSyncedAt`

It is always false for a local-only profile.

## 5. Toast (`ToastService`, in memory)

| Field | Type | Rule |
|---|---|---|
| `toast` | `{ id: number; label: string; text: string } \| null` | At most one. `show()` replaces the current toast and restarts the 5 s timer. `dismiss()` clears it |
| `hosts` | a stack of outlet ids | `App`'s outlet is the base. An open `ThemedModal` or `NavDrawer` pushes its outlet and pops it on close. Only the top outlet renders |

## 6. Profile modal state (`ProfileFlowStore`)

### Phases

| Phase | Kind | Reached from | Needs |
|---|---|---|---|
| `hub` | screen | open (the default) | — |
| `local` | screen | hub | — |
| `cloud` | screen | hub | — |
| `pw` | step | local | — |
| `delprofile` | step | local | not syncing |
| `cloudpw` | step | cloud (linked) | on open: `checkAccount` |
| `unlink` | step | cloud (linked or expired) | — |
| `delcloud` | step | cloud (linked, not expired) | on open: `checkAccount` |
| `in` | step | hub plate, cloud (local), shell `link`, `up` prompt | — |
| `up` | step | the `in` prompt, `linkAfterCreate` | — |
| `reauth` | step | hub plate, cloud (expired), shell `reauth` | — |
| `reset-email` | step | `in`, `reauth` ("Esqueci minha senha") | — |
| `reset-code` | step | `reset-email` | — |

### Link state (derived from the active profile)

- `local`: `cloud === null`
- `expired`: `cloud.needsReauth`
- `linked`: otherwise

### Other state

| Signal | Purpose |
|---|---|
| `phase` | the current phase |
| `origin` | `'hub' \| 'local' \| 'cloud'`: where Cancelar/Concluir return (R18) |
| `backTarget` | the reset flow's return step (`in` or `reauth`) |
| `fields` | `{ name, email, pw, pwNew, pwConfirm, code }` |
| `fieldErrors` | `Partial<Record<'user' \| 'email' \| 'pw' \| 'pwNew' \| 'pwConfirm' \| 'code', string>>` |
| `formError`, `formHint` | `formHint` is the FR-019c line, shown under the form error on `reauth` |
| `emailInUse`, `emailLocked` | as in the entry modal (`emailLocked` on a reset from `reauth`) |
| `loading` | a request is running. It locks the primary and sets its busy label |
| `done` | `'pwChanged' \| 'cloudPwChanged' \| 'linked' \| 'created' \| 'reauthed' \| 'unlinked' \| 'cloudDeleted' \| null` |
| `replacedTribe` | set when a link adopted the account's colors (done copy, as in spec 003) |
| `unsynced` | whether `delprofile` shows the unsynced block (evaluated on open) |
| `blockSync` | `'idle' \| 'syncing' \| 'done' \| 'offline' \| 'reauth' \| 'error'`: the `delprofile` block's line |
| `cooldown`, `resending` | the reset-code resend, as in the entry modal |
| `generation` | a counter bumped on navigation and close, so stale results are dropped |

Derived values include `salvarEnabled`:

```ts
phase === 'local' && fields.name.trim() !== active.name && !loading
```

### Transitions

- **open(start)**: reset everything, then `phase = start ?? 'hub'` and `origin = 'hub'`. `fields.name`
  is loaded from the active profile when `local` opens.
- **Screen navigation**:
  - `openLocal()` and `openCloud()` go from the hub to that screen.
  - `back()` goes from `local` or `cloud` to the hub and discards the unsaved name.
- **openStep(step)**: `origin = phase`, then `go(step)`. For `cloudpw` and `delcloud` it also runs
  `checkAccount` when online.
- **go(phase)**: bumps `generation`, clears the passwords, code, errors, hint and done, and keeps the
  e-mail (as in the entry modal).
- **cancel()** and **concluir()** go to `origin`.
- **Submit results**:

  | Step | On success |
  |---|---|
  | `local` (Salvar) | rename, stay on `local`, toast "Alterações salvas." |
  | `pw` | `done = 'pwChanged'` |
  | `cloudpw` | `done = 'cloudPwChanged'` |
  | `in` | link: `done = 'linked'` |
  | `up` | link: `done = 'created'` |
  | `reset-code` | from `in`: link; from `reauth`: adopt. Then `done = 'linked'` or `'reauthed'` |
  | `reauth` | `done = 'reauthed'` |
  | `unlink` | `done = 'unlinked'`, or the gone path |
  | `delcloud` | `done = 'cloudDeleted'` |
  | `delprofile` | the modal closes, then the entry modal opens on `list`, or the app navigates to `/` (R9) |

- **Account gone** (a `gone` result from `openStep`'s `checkAccount`, the `unlink` submit or the
  `delprofile` block sync): after `forgetGoneAccount`, the store's `toGoneHub()` sets `phase = 'hub'`,
  `origin = 'hub'` and clears the step state. No `effect`. The toast comes from the service.
- **Trocar de perfil** (disabled while syncing): close, then `entryModal.open({ start: 'list' })`.
- **close()** (✕, Esc, backdrop): reset everything. Colors already tapped stay (FR-008).

# Research: Profile Modal

**Feature**: `005-profile-modal` | **Date**: 2026-09-27

The spec has no open NEEDS CLARIFICATION items. Its three sessions of clarifications, plus the design
handoff (`design_handoff_profile_modal/`), settle the behavior and the visuals. This file records the
technical decisions the spec leaves to the plan. Each one lists the decision, the rationale and the
alternatives that were rejected.

Live Supabase facts, checked on 2026-09-27 (project `hyzbkxraanzhdyhtnadf`):
- `card_entries.user_id` and `storage_locations.user_id` both reference `auth.users(id) ON DELETE CASCADE`.
- `public` holds only the functions `rls_auto_enable` and `set_updated_at`. The legacy `delete_current_user()`
  was dropped by spec 003.
- The latest migration is `revoke_unused_default_privileges_from_api_roles`. New functions therefore
  get no default `EXECUTE` for the API roles and need an explicit grant.

---

## R1. A second modal with its own service and store

- **Decision**:
  - A new `ProfileModalService` (`core/services/`) mirrors `EntryModalService`: `open(request?)`,
    `close()`, `isOpen`, `request`.
  - A new `ProfileModal` component (`shared/auth/profile-modal/`) is rendered once in `app.html`,
    next to `<app-entry-modal />`.
  - Its state machine, `ProfileFlowStore`, is provided on the component, like `EntryFlowStore`.
  - Its pure rules (copy per phase, labels, validation, origins) go in a new
    `core/utils/profile-flow.util.ts`.
  - **One modal at a time (FR-005)**:
    - `ProfileModalService.open()` is a no-op while the entry modal is open.
    - "Trocar de perfil" calls `profileModal.close()` and then `entryModal.open({ start: 'list' })`
      synchronously, so `ThemedModal`'s focus return lands on the opener (as the drawer → modal
      hand-off does in spec 004).
- **Rationale**: The two modals answer different questions ("who is at the device" vs. "manage the
  active profile", spec §Modal responsibilities). Their state machines share almost no phases, and
  folding the profile screens into `EntryFlowStore` would double a class that is already ~640 lines.
- **Alternatives rejected**:
  - *A new `profile` context inside the entry modal*: every computed in `EntryFlowStore` would branch
    on it again, which is what the *link* context did and what FR-006 removes.

## R2. Sharing the cloud sign-in forms between the two modals

- **Decision**:
  - `CloudForm` and `ResetForm` stop injecting `EntryFlowStore`. They inject a new abstract class,
    `CloudFlowHost` (`shared/auth/cloud-flow-host.ts`). It declares exactly what those templates read
    and call: `fields`, `fieldErrors`, `shown`, `phase`, `pwLabel`, `pwAutocomplete`, `pwHelper`,
    `plateEmail`, `emailInUse`, `emailLocked`, `editField()`, `forgot()` and `recoverAccess()`.
  - Both stores provide it with `{ provide: CloudFlowHost, useExisting: … }`.
  - The profile modal reuses the phase names `in`, `up`, `reset-email`, `reset-code` and `reauth`, so
    `entry-flow.util`'s `fieldsFor`, `validate`, `pwLabel`, `pwAutocomplete`, `pwHelper`,
    `primaryLabel` and `busyLabel` apply unchanged.
- **Rationale**: The spec says the cloud password reset is shared (§Modal responsibilities). The forms
  are pure templates over a handful of signals, and an abstract-class token is Angular's idiomatic
  seam for this. The copy stays identical because it comes from the same util.
- **Alternatives rejected**:
  - *Copy the forms into the profile modal*: two copies of the same fields and copy would drift.
  - *A shared `CloudFlowStore` service owning the cloud phases*: this means extracting half of
    `EntryFlowStore`, a much bigger refactor for the same outcome.

## R3. What leaves the entry modal (FR-006, FR-024)

- **Decision**:
  - `EntryContext` becomes `'device' | 'gate'`.
  - The phases `reauth` and `unlink`, and the done kinds `reauthed` and `unlinked`, are removed from
    `EntryPhase` and `DoneKind`, along with their copy branches, `EntryStart` members and the
    `link`-context branches in `promptFor`, `colorSourceFor`, `captionFor`, `subtitleFor` and in
    `EntryFlowStore.afterCloudSignIn`.
  - **"Vincular conta na nuvem" on "Perfil criado"** (`linkAfterCreate`, spec 003 FR-037) now closes
    the entry modal and opens the profile modal at `up` (origin `hub`). This is the same hand-off as
    "Trocar de perfil", in reverse.
  - **`recover-form` → "Redefinir senha do perfil"** (FR-024) keeps its phase and flow (verify the
    account password, then `recover-newpw`). It changes:
    - title, subtitle and caption
    - the forgot link's label ("Esqueci a senha da conta")
    - a button row with ghost "Cancelar" (→ `unlock`) and "Continuar"
  - The account-e-mail plate is already shown on `recover-form`.
- **Rationale**: FR-006 draws the line. The unlock → recover path is a "who is at the device" flow, so
  it stays.
- **Alternatives rejected**:
  - *Keep the link context as a dead path*: the project rule is no backward-compatibility code.

## R4. Live color changes (FR-008)

- **Decision**:
  - The profile modal's wheel is `mode="picker"`, with `[picks]` bound to the active profile's colors
    and `(picksChange)` calling `ProfileStore.setColors(id, colors)`.
  - That call patches the signal synchronously and then persists through the serialized queue.
  - `ProfileSessionService.active`, and through it `IdentityService.roles()`, recompute, so the app
    root, the modal (`[roles]`), the profile control and the entry modal's list all retint at once
    (FR-021).
  - `setColors` also stamps `colorsUpdatedAt` (R6).
  - The picker's min-1/max-3 rules are the wheel's own, so nothing else validates colors.
  - A quick series of taps queues one write per tap, and the last one wins (Edge Cases).
- **Rationale**: This is the smallest path. The signal chain that retints the app on a profile switch
  already exists, and a color tap is the same kind of change.
- **Alternatives rejected**:
  - *A draft/preview plus "Salvar"*: the handoff's original design. The spec's 2026-09-27 session
    superseded it.

## R5. Rename (FR-009, FR-009a)

- **Decision**:
  - `ProfileStore.rename(id, name)` trims the name, stamps `nameUpdatedAt` and patches.
  - Name validation is extracted from `entry-flow.util.validate` into
    `validateName(name, isTaken): string | null`. Profile creation and the rename both use it, with
    `isNameTaken(name, exceptId)` so that a case-only change of one's own name passes (Edge Cases).
  - "Salvar" is enabled by `computed(() => fields().name.trim() !== active().name)`.
  - The toast "Alterações salvas." follows a successful save (R13).
- **Rationale**: The rules and messages stay the same as creation (FR-009), and there is one source
  for them.

## R6. Colors and label follow the account (FR-012, FR-012a)

- **Decision**:
  - **Local timestamps**: `ProfileRecord` gains `colorsUpdatedAt` and `nameUpdatedAt` (ISO strings).
    Both are set at creation, and each is restamped by its own setter.
  - **Account timestamps**: the account's `user_metadata` gains `grm_colors_at` and `grm_label_at`,
    next to the existing `grm_colors`/`grm_label` (spec 003 R6).
  - **An identity step in each sync**, which runs first, before locations and cards:
    - `SyncService.exchange` calls `client.auth.getUser()`, which also detects a deleted account
      (R12).
    - It passes the metadata to a pure `reconcileIdentity(local, remote)` in
      `core/utils/identity-sync.util.ts`.
  - **Colors are last-write-wins on the timestamps**:
    - If the remote is newer, the result is `adoptColors`: `ProfileStore.setColors(id, colors, remoteAt)`.
      It keeps the remote timestamp, and the app retints silently.
    - If the local side is newer, or the account has no colors, the result is `writeColors`.
  - **The label is written only when the local rename is newer** than `grm_label_at`, and it is
    never read back into the local name. Each device keeps its own name, and the label records the
    latest rename.
  - Everything to write goes in one `auth.updateUser({ data })`. A failure here fails the sync like
    any other sync request.
  - **Link and sign-up** (`CloudAuthService.linkPending`, `signUp`) write the timestamps as well. When
    the account's colors replace the profile's on link (spec 003 FR-026), `colorsUpdatedAt` takes
    `grm_colors_at` (or "now" if it's absent).
- **Rationale**: The spec asks for "the most recent color change from any device wins". That needs a
  change time on both sides, and entity sync already uses per-row `updatedAt` last-write-wins. Keeping
  the metadata in `user_metadata` means no new table or grants.
- **Alternatives rejected**:
  - *A `profile_settings` table*: it needs grants, RLS and a migration for two values the auth user
    already carries.
  - *Write the label on every sync*: a device that never renamed would overwrite another device's
    newer rename.
- **Note**: Profiles created before this change lack the two fields. No migration is added (the
  project rule). The quickstart prerequisites say to start from a clean device.

## R7. Local password change (FR-010)

- **Decision**: The `pw` step validates the three fields in this order:
  1. current not empty → `MSG.pwEmpty`
  2. new ≥ 8 → `MSG.pwMin`
  3. confirmation equal → `MSG.pwMismatch` (new: "As senhas não são iguais.")

  It then runs `ProfileStore.verifyPassword`. A wrong current password gives `MSG.wrongLocal` on the
  current field. On success it calls `ProfileStore.setPassword`, which already stores a new
  PBKDF2 hash. Everything works offline.
- **Rationale**: This reuses the existing hashing. The handoff fixes the three-field order.

## R8. Cloud account password change (FR-016a)

- **Decision**: `CloudAuthService.changeAccountPassword(profileId, current, next)` runs through the
  existing `run()` wrapper (offline check, `mapCloudError`):
  1. **Verify the current password**: `signInWithPassword` on a transient client with the linked
     e-mail, then check that the returned `user.id` equals the link's `userId`. That session is
     discarded with `signOut({ scope: 'local' })`. `invalid_credentials` maps to `MSG.wrongCloud`.
  2. `client(profileId).auth.updateUser({ password: next })`.
  3. `client(profileId).auth.signOut({ scope: 'others' })` ends every other session of the account,
     so other devices fall into "Sessão expirada" at their next cloud action (R12). This device's
     session is kept.
  4. The profile stays linked. The local password is untouched.
- **New error mapping**: `same_password` maps to a field error on the new password, `MSG.samePassword`
  ("A nova senha precisa ser diferente da atual.").

  **Review needed**: this string is not in the handoff. It's a Supabase-specific rejection that
  otherwise would fall to the generic message.
- **Rationale**: supabase-js has no "verify password" call. `reauthenticate()` sends an e-mail nonce,
  which is the wrong UX here. A throwaway sign-in is the same technique `verifyLinkedAccount` already
  uses. GoTrue does not revoke other sessions on a password update, so the explicit `scope: 'others'`
  is required.

## R9. Deleting a local profile (FR-017, FR-018)

- **Decision**: A new `ProfileLifecycleService.deleteProfile(id, password)` (`core/services/`):
  1. `verifyPassword`, or fail with `MSG.wrongLocal`.
  2. `ProfileSessionService.signOut()`. This flushes, rebinds the entity services to no profile,
     applies the default identity, persists `activeProfileId = null` and re-guards the current route.
  3. The cloud cleanup for a linked profile, under `whileUnlinking`, with no network needed:
     - `stopAutoRefresh`
     - a best-effort `signOut({ scope: 'local' })` when online
     - `removeSession`

     The account and its cloud data are untouched (FR-018).
  4. `deleteProfileDb(id)`, a new function in `profile-db.ts`: it closes the memoized connection,
     then `deleteDB(profileDbName(id))`.
  5. `ProfileStore.remove(id)`.

  It returns the number of profiles left. The store then either:
  - closes the profile modal and opens the entry modal on `list`, when profiles remain, or
  - closes it and runs `router.navigateByUrl('/')`, when none remain (FR-018b).
- **Rationale**: One database per profile (spec 003 R1) makes deletion a `deleteDB`. Isolation of the
  other profiles holds by construction (SC-004). Signing out first means no service holds the
  database open when it is deleted.
- **Alternatives rejected**:
  - *Clear the stores and keep the database*: it leaves an empty `grimorio-profile-{id}` behind for
    no reason.

## R10. "Local changes not yet synced" (FR-018a)

- **Decision**: A pure `hasUnsyncedChanges(input)` in `core/utils/sync-status.util.ts` returns true
  when a linked profile has any of:
  - a tombstone (cards or locations)
  - a card or location with `updatedAt > lastSyncedAt`, or any such row when `lastSyncedAt` is null
  - `colorsUpdatedAt` or `nameUpdatedAt` later than `lastSyncedAt`

  Decks never sync, so they don't count. The inputs come from `CardService`, `StorageLocationService`
  (`getTombstones()`), `SyncService.lastSyncedAt()` and the active profile. The store evaluates it
  when `delprofile` opens, and again after the in-place sync.
- **Rationale**: This uses what already exists. The check is conservative: clock skew can only cause
  an extra warning, never a missed one.

## R11. Deleting the cloud account (FR-019, FR-019a)

- **Decision**:
  - **The server step**: a `SECURITY DEFINER` Postgres function,
    `public.delete_own_account() returns void`. It is owned by `postgres`, with `set search_path = ''`,
    and its body is `delete from auth.users where id = (select auth.uid());`.
    - It raises if `auth.uid()` is null.
    - `EXECUTE` is revoked from `public` and `anon`, and granted to `authenticated` only.
    - The existing `ON DELETE CASCADE` foreign keys remove every `card_entries` and
      `storage_locations` row in the same transaction. Auth sessions, identities and refresh tokens
      cascade inside `auth`.
    - The whole deletion is one statement in one transaction: all or nothing (FR-019a).
  - **The client**: `CloudAuthService.deleteAccount(profileId, password)`:
    1. `run()` (offline → `MSG.offline`).
    2. Verify the password with a transient sign-in, as in R8.
    3. `client(profileId).rpc('delete_own_account')`.
    4. Under `whileUnlinking`: `removeSession`, then `ProfileStore.setCloud(id, null)`.
    5. The done screen "Conta excluída".
  - **The connection drops after the server commits**: the client reports the offline failure, so it
    never shows a false success. The account really is gone, and the next cloud action finds it gone
    (R12) and turns the profile local-only with the FR-019b toast.
- **Rationale**: A signed-in client can't delete its own auth user (spec Assumption), so a trusted
  server step is needed. A definer function scoped to `auth.uid()` is the smallest one. It is atomic,
  and the cascade already exists, so no per-table deletes can drift from the schema.
- **Alternatives rejected**:
  - *An Edge Function with `auth.admin.deleteUser`*: it adds a deployed function, a service-role
    secret and a second runtime for one statement.
  - *Check the password inside the function* (`crypt()` against `encrypted_password`): it couples to
    GoTrue's storage format and bypasses its rate limiting.
- **Migration**: `005_delete_own_account`, applied with `apply_migration`. See
  [contracts/supabase.md](contracts/supabase.md).

## R12. Finding out that an account is gone or a session has ended (FR-019b, FR-019c, FR-016a)

- **Decision**: A new `CloudAuthService.checkAccount(profileId)` calls `client(profileId).auth.getUser()`
  and returns one of four results:

  | Result | When |
  |---|---|
  | `ok` | `getUser()` succeeds |
  | `gone` | error code `user_not_found` |
  | `expired` | auth errors per `SyncService`'s existing set, or no session |
  | `offline` | the device is offline or the request hits a network error |

  - **It runs at every "first cloud action"**:
    - at the start of each sync (inside the identity step, R6, before any table request)
    - on opening `cloudpw` and `delcloud`
    - on submitting `unlink` while online
  - **On `gone`**, `CloudAuthService.forgetGoneAccount(profileId)` does the following, with no network
    needed:
    1. `removeSession`
    2. `setCloud(id, null)`, with local data intact
    3. shows the toast "A conta {e-mail} não existe mais. {nome} continua neste aparelho com todos os
       dados."
    4. bumps an `accountGone` signal. `ProfileFlowStore` doesn't watch it: every gone result
       reaching an open modal comes through the store's own calls, which return to the hub
  - `SyncService` gains the outcome `gone`: the state goes back to `idle`, and the display then shows
    `local`.
  - **On `expired`**, the existing `markNeedsReauth` path runs.
  - **FR-019c**: when "Entrar de novo" fails with `invalid_credentials`, the form error is
    `MSG.wrongCloud` plus `MSG.goneHint(nome)`: "Se a conta não existe mais, Desvincular conta mantém
    {nome} e os dados neste aparelho."

    **Review needed**: this string is new and not in the handoff.
- **Rationale**:
  - `getUser()` is the only client call that asks GoTrue about the user, rather than trusting the
    JWT. PostgREST alone would accept a still-valid access token for up to an hour and return empty
    rows, which the reconciler would read as "everything deleted remotely".
  - GoTrue checks the user and then the JWT's session. So:
    - a deleted user gives `user_not_found`
    - a session revoked by R8's `scope: 'others'` gives `session_not_found`, which is treated as
      expired
    - once the access token has expired, a refresh against deleted tokens gives
      `refresh_token_not_found`, the case FR-019c covers
- **To verify during implementation** (quickstart V17/V18): the exact error codes from the live
  project for a deleted user and for a revoked session. If the deleted user surfaces as a session
  error, FR-019c's fallback is the specified behavior, so nothing else changes.

## R13. Toasts above a modal `<dialog>` (FR-022)

- **Decision**:
  - **The service**: a `ToastService` (`core/services/`) holds `toast: {label, text, id} | null`.
    - `show(label, text)` replaces the current toast and restarts a 5 s timer.
    - `dismiss()` clears it.
  - **The component**: `ToastOutlet` (`shared/ds/toast/`) renders the toast in a `popover="manual"`
    element and calls `showPopover()` while it is the active outlet and a toast exists.
  - **The hosts**: outlets are placed in `App` (the page), `ThemedModal` (the entry and profile
    modals) and `NavDrawer`. Each dialog's outlet registers on open and unregisters on close, through
    `ToastService.pushHost()`/`popHost()`. Only the top host's outlet renders, so exactly one toast
    region is ever visible.
  - The live region (`role="status"`, `aria-live="polite"`) is always present in each outlet, so
    screen readers announce content that is inserted later.
- **Rationale**:
  - A modal `<dialog>` sits in the top layer and makes everything outside its subtree inert, so no
    `z-index` on a page-level element can appear above it, or be clickable (its ✕).
  - A popover that is a flat-tree descendant of the open dialog is shown in the top layer above the
    dialog and stays interactive.
  - `showPopover()` doesn't move focus, and a manual popover has no light dismiss, so the toast never
    steals focus or closes on outside clicks.
  - The result is visually one app-wide region (FR-022) that works whether or not a modal is open.
- **Alternatives rejected**:
  - *One page-level popover*: it is inert while a modal is open, so its ✕ can't be used. It would
    also sit below a dialog opened after it.
  - *A toast per modal*: the spec requires the app-wide region.

## R14. Identity wheel v2 (FR-023)

- **Decision**:
  - `IdentityWheel` (`shared/ds/identity-wheel/`) is rewritten in place to the handoff's
    `IdentityWheelV2.js` anatomy:
    - every swatch has a `disc`, a `rim` and a `dot`
    - the state classes are `on`, `off`, `locked` and `neutral`
    - the hover is `off:hover`
  - Its inputs and outputs (`mode`, `picks` model, `neutral`, `subline`, `size`) are unchanged. The
    entry modal and the profile modal pick it up without template changes.
  - Pick rules, positions, the 28 s spin, the ripple and the burst stay as they are.
  - **Breathing** is a CSS animation.
  - **Motes** come from a 700 ms `setInterval`, started in `afterNextRender` and cleared on destroy.
    - On each tick, every selected color emits one mote with a 26% chance: a signal list of
      `{id, x, y, dx, dy, dur, peak}`.
    - Each mote is removed on `animationend`, the same pattern as the bursts.
    - No interval runs while `prefers-reduced-motion` matches.
  - Under reduced motion, breathing, motes, spin and bursts all stop (FR-023).
  - Locked swatches get `aria-disabled="true"`, and `aria-pressed` is kept.
- **Rationale**: The component's contract doesn't change, only its visuals and motion, so one rewrite
  covers both modals. Signals plus `animationend` match how the bursts already work.

## R15. Empty-device state on Home (FR-018b)

- **Decision**:
  - `Home` injects `ProfileStore` and renders the empty state when `profiles().length === 0`.
  - "Criar perfil" calls `entryModal.open({ context: 'device', start: 'profile' })`.
  - Otherwise Home keeps its current (empty) content.
  - The empty state is a new DS pattern in `DESIGN.md`, built with `.eyebrow`, muted text and
    `.btn--primary`.
- **Rationale**: The spec puts it on Home for every profile-less device. The gate behavior stays
  unchanged.

## R16. Shell entry points (FR-001, FR-007)

- **Decision**:
  - `TopBar.openProfile()` and `NavDrawer.onProfile()` call `profileModal.open()` when a profile is
    active, and `entryModal.open()` otherwise.
  - `SyncStatusService.act()` routes the actions that open a modal to the profile modal:
    `link` → `{ start: 'in' }`, `reauth` → `{ start: 'reauth' }`.
  - `NavDrawer.onSyncAction()` does the same after closing the drawer.
  - `SHELL.profileHint` and `SHELL.profileLabel`'s tail change from "Trocar de perfil ou sair" to
    "Gerenciar perfil".

    **Review needed**: the handoff doesn't give a new accessible name. The old one no longer
    describes the destination.
- **Rationale**: The shell already funnels every modal opening through these three places.

## R17. Syncing from inside the modal and the sync lock

- **Decision**:
  - The hub's sync plate and the `delprofile` block call `SyncStatusService.act()` or
    `SyncService.syncNow()` directly (FR-016).
  - While `SyncStatusService.busy()`:
    - "Trocar de perfil" and "Excluir perfil" (the `delprofile` row and its submit) are disabled,
      following spec 004 FR-005a.
    - The plate hides its button and shows "Sincronizando…".
  - The block's outcome maps as follows:
    - `done` → "Sincronizado agora — nada se perde na nuvem."
    - `offline`, `reauth` or `error` → the SyncLine failure label + "Tentar de novo"
    - `gone` → R12, and the store goes back to the hub
- **Rationale**: The shell's sync controls sit under the modal's backdrop, so this is the only place
  a sync can start while the modal is open, as the spec intends.

## R18. Where each action step returns (FR-004a)

- **Decision**:
  - The store keeps `origin: 'hub' | 'local' | 'cloud'`, set when a step is opened from that screen.
    Steps reached by a direct open (the shell's sync area, "Vincular conta na nuvem" on the hub
    plate, or `linkAfterCreate`) take `origin = 'hub'`.
  - Moving between cloud sub-steps keeps the origin:
    - `in` ↔ `up`
    - `in`/`reauth` → `reset-email` → `reset-code`
  - "Cancelar" and "Concluir" go to the origin. Sub-screens' "Voltar" goes to the hub.
  - The reset flow's "Lembrou a senha? Voltar" returns to the step it came from (`in` or `reauth`),
    as `EntryFlowStore.backTarget` does.
- **Rationale**: This follows the handoff's `backTo`.

## R19. Fluid height, focus and reset shared with the entry modal

- **Decision**: `EntryModal`'s fluid-height measuring (the ResizeObserver, `PANE_CHROME` and the
  capped check) and its "focus the first field on a new screen" effect are extracted into
  `shared/ds/themed-modal/fluid-face.ts`: a small helper class created in each modal's constructor.
  `ProfileModal` uses it with the same constants.
- **Rationale**: Both modals must behave the same (FR-020), and duplicating ~40 lines of measuring
  logic would drift.

## R20. DESIGN.md first (Constitution V)

- **Decision**: The first implementation phase adds or updates these `DESIGN.md` entries, before any
  UI is built:

  | Entry | Status | What it covers |
  |---|---|---|
  | **Themed modal** modes | Updated | The profile modal and its screens; the entry modal loses the link/reauth/unlink modes |
  | **Identity wheel** | Updated | The v2 anatomy and states; picker in the create step and on every profile-modal screen; breathing and motes; the reduced-motion list |
  | **Action rows** | New | The hub and sub-screen rows: a leading mini wheel or spacer, title + meta, a trailing micro-label verb, and a danger variant with the title in `danger` |
  | **Sync plate** | New | The hub's expanded sync area; expired uses the `danger` border |
  | **Danger plate** | New | The unsynced-changes block: a plate with a `danger` border |
  | **Toast** | New | |
  | **Empty-device state** | New | |
  | **Profile control** | Updated | It opens the profile modal |
  | **Content** | Updated | The new messages |
- **Rationale**: Constitution Principle V: a visual decision `DESIGN.md` doesn't cover must be added
  there before it is built. The spec's Assumptions say the same.
